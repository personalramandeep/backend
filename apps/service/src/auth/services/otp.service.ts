import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { RedisClientType } from 'redis';
import { ConfigService } from '../../config/config.service';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { CryptoService } from './crypto.service';

interface IOtpRecord {
  hash: string;
  attempts: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly prefix: string;
  private readonly ttlSeconds: number;
  private readonly maxAttempts: number;
  private readonly rateLimitMax: number;
  private readonly rateLimitWindow: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoService,
  ) {
    this.prefix = this.configService.redisConfig.keyPrefix;
    const otp = this.configService.otpConfig;
    this.ttlSeconds = otp.ttlSeconds;
    this.maxAttempts = otp.maxAttempts;
    this.rateLimitMax = otp.rateLimitMax;
    this.rateLimitWindow = otp.rateLimitWindowSeconds;
  }

  private key(phone: string): string {
    return `${this.prefix}auth:otp:${phone}`;
  }

  private rateKey(phone: string): string {
    return `${this.prefix}auth:otp_rate:${phone}`;
  }

  private lockKey(phone: string): string {
    return `${this.prefix}auth:otp_lock:${phone}`;
  }

  async sendOtp(phone: string): Promise<{ expiresIn: number }> {
    await this.assertNotLocked(phone);
    await this.assertAndIncrementRateLimit(phone);

    const { devMode, devFixedCode } = this.configService.otpConfig;

    const otp = devMode && devFixedCode ? devFixedCode : this.cryptoService.generateOtp(6);
    const hash = this.cryptoService.hashOtp(otp);

    const record: IOtpRecord = { hash, attempts: 0 };

    // Overwrite any previous OTP for this phone — single active OTP per number
    await this.redis.set(this.key(phone), JSON.stringify(record), { EX: this.ttlSeconds });

    if (devMode) {
      this.logger.warn(`[DEV MODE] OTP for ${phone} → ${otp} (SMS not sent)`);
    } else {
      await this.dispatchSms(phone, otp);
    }

    return { expiresIn: this.ttlSeconds };
  }

  async verifyOtp(phone: string, otp: string): Promise<true> {
    await this.assertNotLocked(phone);

    const raw = await this.redis.get(this.key(phone));

    if (!raw) {
      throw new BadRequestException({ message: 'OTP expired or not found', code: 'OTP_EXPIRED' });
    }

    const record: IOtpRecord = JSON.parse(raw) as IOtpRecord;

    // Increment attempts before checking
    // prevents parallel-request brute force
    record.attempts += 1;

    if (record.attempts >= this.maxAttempts) {
      await this.redis.del(this.key(phone));
      await this.redis.set(this.lockKey(phone), '1', { EX: 30 * 60 });
      throw new HttpException(
        {
          message: 'Too many failed attempts. Please request a new OTP.',
          code: 'OTP_MAX_ATTEMPTS',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Persist incremented attempt count with the remaining TTL
    const remainingTtl = await this.redis.ttl(this.key(phone));
    await this.redis.set(this.key(phone), JSON.stringify(record), {
      EX: Math.max(remainingTtl, 1),
    });

    const valid = this.cryptoService.verifyOtp(otp, record.hash);
    if (!valid) {
      throw new BadRequestException({ message: 'Invalid OTP', code: 'OTP_INVALID' });
    }

    // consume the OTP (one-time use)
    await this.redis.del(this.key(phone));
    return true;
  }

  private async assertNotLocked(phone: string): Promise<void> {
    const locked = await this.redis.exists(this.lockKey(phone));
    if (locked) {
      throw new HttpException(
        {
          message: 'Phone is temporarily locked due to too many failed attempts',
          code: 'OTP_LOCKED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async assertAndIncrementRateLimit(phone: string): Promise<void> {
    const rk = this.rateKey(phone);

    const pipeline = this.redis.multi();
    pipeline.incr(rk);
    pipeline.ttl(rk);
    const results = await pipeline.exec();

    if (!results || results.length < 2) {
      throw new InternalServerErrorException('Failed to process rate limit');
    }

    const count = results[0] as unknown as number;
    const ttl = results[1] as unknown as number;

    if (count === 1 || ttl === -1) {
      await this.redis.expire(rk, this.rateLimitWindow);
    }

    if (count > this.rateLimitMax) {
      throw new HttpException(
        {
          message: 'Too many OTP requests. Please wait before requesting again.',
          code: 'OTP_RATE_LIMIT',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async dispatchSms(phone: string, otp: string): Promise<void> {
    const gatewayUrl = this.configService.get('SMS_GATEWAY_URL');
    if (!gatewayUrl) {
      throw new InternalServerErrorException(
        'SMS_GATEWAY_URL is not configured. Set OTP_DEV_MODE=true for local development.',
      );
    }

    const url = gatewayUrl
      .replace('<<PHONE_NUMBER>>', encodeURIComponent(phone))
      .replace('<<OTP>>', otp);

    try {
      const res = await fetch(url);

      if (!res.ok) {
        this.logger.error(`SMS gateway returned ${res.status} for ${phone}`);
        throw new InternalServerErrorException('SMS dispatch failed');
      }

      this.logger.log(`OTP dispatched to ${phone}`);
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      this.logger.error(`SMS dispatch error for ${phone}`, (err as Error).message);
      throw new InternalServerErrorException('SMS dispatch failed');
    }
  }
}
