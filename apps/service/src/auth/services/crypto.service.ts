import { Injectable } from '@nestjs/common';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class CryptoService {
  constructor(private readonly configService: ConfigService) {}

  generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  generateOtp(length = 6): string {
    return Array.from({ length }, () => randomInt(0, 10)).join('');
  }

  hashOtp(otp: string): string {
    const secret = this.configService.get('OTP_HMAC_SECRET');
    return createHmac('sha256', secret).update(otp).digest('hex');
  }

  verifyOtp(plain: string, storedHash: string): boolean {
    const candidateHash = Buffer.from(this.hashOtp(plain));
    const knownHash = Buffer.from(storedHash);

    if (candidateHash.length !== knownHash.length) return false;

    return timingSafeEqual(candidateHash, knownHash);
  }
}
