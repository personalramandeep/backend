import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { ConfigService } from '../../config/config.service';
import { REDIS_CLIENT } from '../redis.constants';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTtl = this.configService.redisConfig.cacheTtl;

  constructor(
    @Inject(REDIS_CLIENT) private readonly client: RedisClientType,
    private readonly configService: ConfigService,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (err) {
      this.logger.error(`Cache GET failed for key "${key}": ${(err as Error).message}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds ?? this.defaultTtl;
      await this.client.set(key, serialized, { EX: ttl });
    } catch (err) {
      this.logger.error(`Cache SET failed for key "${key}": ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.error(`Cache DEL failed for key "${key}": ${(err as Error).message}`);
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const reply = await this.client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = reply.cursor;
        if (reply.keys.length > 0) {
          await this.client.del(reply.keys);
        }
      } while (cursor != '0');
    } catch (err) {
      this.logger.error(`Cache DEL_BY_PATTERN failed for "${pattern}": ${(err as Error).message}`);
    }
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await factory();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }
}
