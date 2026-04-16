import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { ConfigService } from '../../config/config.service';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { LeaderboardScope, LeaderboardWindow } from '../leaderboard.types';

export interface LeaderboardZSetMember {
  userId: string;
  score: number;
}

export const UNIVERSAL_SPORT_KEY = 'univ';

@Injectable()
export class LeaderboardRedisService {
  private readonly logger = new Logger(LeaderboardRedisService.name);
  private readonly prefix: string;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
    private readonly configService: ConfigService,
  ) {
    this.prefix = this.configService.redisConfig.keyPrefix;
  }

  /** sportId = UUID (sport-specific) or 'univ' (universal).
   *  Examples:
   *    kreeda:lb:badminton-uuid:global:all_time
   *    kreeda:lb:univ:global:all_time  */
  buildKey(
    sportId: string,
    scope: LeaderboardScope = 'global',
    window: LeaderboardWindow = 'all_time',
  ): string {
    return `${this.prefix}lb:${sportId}:${scope}:${window}`;
  }

  async zadd(key: string, userId: string, score: number): Promise<void> {
    try {
      await this.redis.zAdd(key, [{ score, value: userId }]);
    } catch (err) {
      this.logger.error(`ZADD failed for key ${key}: ${(err as Error).message}`);
      throw err;
    }
  }

  async zrem(key: string, userId: string): Promise<void> {
    await this.redis.zRem(key, userId);
  }

  async zrevrank(key: string, userId: string): Promise<number | null> {
    return this.redis.zRevRank(key, userId);
  }

  async zscore(key: string, userId: string): Promise<number | null> {
    const raw = await this.redis.zScore(key, userId);
    return raw ?? null;
  }

  async zcard(key: string): Promise<number> {
    return this.redis.zCard(key);
  }

  /**
   * Returns members in descending score order (rank 1 = index 0).
   */
  async zrangeRev(key: string, start: number, stop: number): Promise<LeaderboardZSetMember[]> {
    const raw = await this.redis.zRangeWithScores(key, start, stop, { REV: true });
    return raw.map((r) => ({ userId: r.value, score: r.score }));
  }

  async appendToKey(key: string, members: LeaderboardZSetMember[]): Promise<void> {
    if (!members.length) return;
    const BATCH = 500;
    for (let i = 0; i < members.length; i += BATCH) {
      const batch = members.slice(i, i + BATCH);
      await this.redis.zAdd(
        key,
        batch.map((m) => ({ score: m.score, value: m.userId })),
      );
    }
  }

  async deleteKey(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
