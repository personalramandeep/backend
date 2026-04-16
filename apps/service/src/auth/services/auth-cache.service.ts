import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { CacheService } from '../../redis/cache/cache.service';
import { IAuthenticatedUser } from '../auth.types';

export type ICachedUser = IAuthenticatedUser;

@Injectable()
export class AuthCacheService {
  private readonly logger = new Logger(AuthCacheService.name);
  private prefix: string;

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.prefix = `${this.configService.redisConfig.keyPrefix}auth:session:`;
  }

  private getKey(sessionId: string): string {
    return `${this.prefix}${sessionId}`;
  }

  async getSession(sessionId: string): Promise<ICachedUser | null> {
    try {
      const cached = await this.cacheService.get<ICachedUser>(this.getKey(sessionId));
      return cached;
    } catch (err) {
      this.logger.error(`Failed to get session from cache: ${(err as Error).message}`);
      return null;
    }
  }

  async setSession(sessionId: string, user: ICachedUser, ttlSeconds: number): Promise<void> {
    try {
      await this.cacheService.set(this.getKey(sessionId), user, ttlSeconds);
    } catch (err) {
      this.logger.error(`Failed to set session in cache: ${(err as Error).message}`);
    }
  }

  async invalidateSession(sessionId: string): Promise<void> {
    try {
      await this.cacheService.del(this.getKey(sessionId));
    } catch (err) {
      this.logger.error(`Failed to invalidate session in cache: ${(err as Error).message}`);
    }
  }
}
