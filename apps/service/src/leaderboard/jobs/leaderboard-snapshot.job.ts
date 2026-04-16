import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { ConfigService } from '../../config/config.service';
import { LB_DEFAULT_SCOPE, LB_DEFAULT_WINDOW } from '../leaderboard.constants';
import { LeaderboardScope, LeaderboardWindow } from '../leaderboard.types';
import { LeaderboardSnapshotRepository } from '../repositories/leaderboard-snapshot.repository';
import { PlayerPerformanceScoreRepository } from '../repositories/player-performance-score.repository';
import {
  LeaderboardRedisService,
  UNIVERSAL_SPORT_KEY,
} from '../services/leaderboard-redis.service';

const SNAPSHOT_BATCH_SIZE = 200;

@Injectable()
export class LeaderboardSnapshotJob {
  private readonly logger = new Logger(LeaderboardSnapshotJob.name);

  constructor(
    private readonly perfScoreRepo: PlayerPerformanceScoreRepository,
    private readonly snapshotRepo: LeaderboardSnapshotRepository,
    private readonly redisService: LeaderboardRedisService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'leaderboard-daily-snapshot' })
  async runDailySnapshot(): Promise<void> {
    this.logger.log('Leaderboard daily snapshot started');

    const snapshotDate = DateTime.utc().minus({ days: 1 }).toISODate();

    try {
      const sportScores = await this.perfScoreRepo.findDistinctSports();
      this.logger.log(`Snapshotting ${sportScores.length} sport(s) + universal board`);

      if (this.configService.sportLeaderboardEnabled) {
        for (const sportId of sportScores) {
          await this.snapshotBoard(sportId, LB_DEFAULT_SCOPE, LB_DEFAULT_WINDOW, snapshotDate);
        }
      } else {
        this.logger.log('Sport leaderboard disabled — skipping per-sport snapshots');
      }

      // universal board
      await this.snapshotBoard(
        UNIVERSAL_SPORT_KEY,
        LB_DEFAULT_SCOPE,
        LB_DEFAULT_WINDOW,
        snapshotDate,
      );

      this.logger.log('Leaderboard daily snapshot completed');
    } catch (err) {
      this.logger.error(
        `Leaderboard daily snapshot failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  /** Snapshots a single leaderboard board (sport or universal). */
  private async snapshotBoard(
    sportId: string,
    scope: LeaderboardScope,
    window: LeaderboardWindow,
    snapshotDate: string,
  ): Promise<void> {
    const key = this.redisService.buildKey(sportId, scope, window);
    const total = await this.redisService.zcard(key);

    if (total === 0) {
      this.logger.warn(`Skipping snapshot for ${sportId}:${scope}:${window} — ZSET is empty`);
      return;
    }

    let processed = 0;

    while (processed < total) {
      const batch = await this.redisService.zrangeRev(
        key,
        processed,
        processed + SNAPSHOT_BATCH_SIZE - 1,
      );

      const batchStartOffset = processed;

      const userIds = batch.map((m) => m.userId);
      const previousMap = await this.snapshotRepo.findLatestBeforeMany(
        userIds,
        sportId,
        scope,
        window,
        snapshotDate,
      );

      await Promise.all(
        batch.map(async (member, i) => {
          const rank = batchStartOffset + i + 1; // 1-indexed

          const previous = previousMap.get(member.userId) ?? null;
          const prevRank = previous?.rank ?? null;
          const rankDelta = prevRank !== null ? prevRank - rank : null; // positive = moved up

          await this.snapshotRepo.upsert({
            userId: member.userId,
            sportId,
            scope,
            window,
            rank,
            prevRank,
            rankDelta,
            avgScore: member.score,
            snapshotDate,
          });
        }),
      );

      processed += batch.length;

      if (batch.length < SNAPSHOT_BATCH_SIZE) break;
    }

    this.logger.log(
      `Snapshot wrote ${processed} entries for ${sportId}:${scope}:${window} on ${snapshotDate}`,
    );
  }
}
