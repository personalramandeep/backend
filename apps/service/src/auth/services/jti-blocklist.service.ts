import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { ConfigService } from '../../config/config.service';
import { REDIS_CLIENT } from '../../redis/redis.constants';

@Injectable()
export class JtiBlocklistService {
  private readonly prefix: string;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
    private readonly configService: ConfigService,
  ) {
    this.prefix = this.configService.redisConfig.keyPrefix;
  }

  private key(jti: string): string {
    return `${this.prefix}auth:jti:blocked:${jti}`;
  }

  async block(jti: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.key(jti), '1', { EX: ttlSeconds });
  }

  async isBlocked(jti: string): Promise<boolean> {
    return (await this.redis.exists(this.key(jti))) === 1;
  }
}
