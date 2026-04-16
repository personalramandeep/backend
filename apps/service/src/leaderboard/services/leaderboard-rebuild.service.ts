import { Injectable, Logger } from '@nestjs/common';
import { LB_DEFAULT_SCOPE, LB_DEFAULT_WINDOW } from '../leaderboard.constants';
import { PlayerPerformanceScoreRepository } from '../repositories/player-performance-score.repository';
import { UniversalPerformanceScoreRepository } from '../repositories/universal-performance-score.repository';
import { LeaderboardReadService } from './leaderboard-read.service';
import {
  LeaderboardRedisService,
  LeaderboardZSetMember,
  UNIVERSAL_SPORT_KEY,
} from './leaderboard-redis.service';

const PAGE_SIZE = 1000;

export interface RebuildResult {
  sport_id: string;
  members_written: number;
  duration_ms: number;
}

@Injectable()
export class LeaderboardRebuildService {
  private readonly logger = new Logger(LeaderboardRebuildService.name);

  constructor(
    private readonly perfScoreRepo: PlayerPerformanceScoreRepository,
    private readonly universalScoreRepo: UniversalPerformanceScoreRepository,
    private readonly redisService: LeaderboardRedisService,
    private readonly readService: LeaderboardReadService,
  ) {}

  async rebuildAll(): Promise<RebuildResult[]> {
    this.logger.log('Full leaderboard rebuild started');

    const sportIds = await this.perfScoreRepo.findDistinctSports();

    const sportResults = await Promise.all(sportIds.map((id) => this.rebuildSport(id)));

    const univResult = await this.rebuildUniversal();

    const results = [...sportResults, univResult];
    this.logger.log(`Full leaderboard rebuild complete — ${results.length} board(s) rebuilt`);
    return results;
  }

  async rebuildSport(sportId: string): Promise<RebuildResult> {
    const start = Date.now();
    this.logger.log(`Rebuilding sport board: ${sportId}`);

    const key = this.redisService.buildKey(sportId, LB_DEFAULT_SCOPE, LB_DEFAULT_WINDOW);
    await this.redisService.deleteKey(key);

    let skip = 0;
    let totalWritten = 0;

    while (true) {
      const rows = await this.perfScoreRepo.findBySportIdPage(sportId, skip, PAGE_SIZE);
      if (!rows.length) break;

      const members: LeaderboardZSetMember[] = rows.map((r) => ({
        userId: r.user_id,
        score: r.avg_score,
      }));

      await this.redisService.appendToKey(key, members);
      totalWritten += members.length;
      skip += rows.length;

      if (rows.length < PAGE_SIZE) break;
    }

    await this.readService.invalidateWidgetCache(sportId);

    const result: RebuildResult = {
      sport_id: sportId,
      members_written: totalWritten,
      duration_ms: Date.now() - start,
    };
    this.logger.log(
      `Sport board ${sportId} rebuilt — ${totalWritten} members (${result.duration_ms}ms)`,
    );
    return result;
  }

  async rebuildUniversal(): Promise<RebuildResult> {
    const start = Date.now();
    this.logger.log('Rebuilding universal board');

    const key = this.redisService.buildKey(
      UNIVERSAL_SPORT_KEY,
      LB_DEFAULT_SCOPE,
      LB_DEFAULT_WINDOW,
    );
    await this.redisService.deleteKey(key);

    let skip = 0;
    let totalWritten = 0;

    while (true) {
      const rows = await this.universalScoreRepo.findPage(skip, PAGE_SIZE);
      if (!rows.length) break;

      const members: LeaderboardZSetMember[] = rows.map((r) => ({
        userId: r.user_id,
        score: r.avg_score,
      }));

      await this.redisService.appendToKey(key, members);
      totalWritten += members.length;
      skip += rows.length;

      if (rows.length < PAGE_SIZE) break;
    }

    await this.readService.invalidateWidgetCache(undefined);

    const result: RebuildResult = {
      sport_id: UNIVERSAL_SPORT_KEY,
      members_written: totalWritten,
      duration_ms: Date.now() - start,
    };
    this.logger.log(`Universal board rebuilt — ${totalWritten} members (${result.duration_ms}ms)`);
    return result;
  }

  async rebuildForUser(userId: string): Promise<void> {
    this.logger.log(`Rebuilding scores for user: ${userId}`);

    const sportScores = await this.perfScoreRepo.findAllForUser(userId);
    const universalScore = await this.universalScoreRepo.findByUserId(userId);

    const sportIds = sportScores.map((r) => r.sport_id);

    await Promise.all([
      ...sportScores.map((row) => {
        const key = this.redisService.buildKey(row.sport_id, LB_DEFAULT_SCOPE, LB_DEFAULT_WINDOW);
        return this.redisService.zadd(key, userId, row.avg_score);
      }),
      universalScore
        ? this.redisService.zadd(
            this.redisService.buildKey(UNIVERSAL_SPORT_KEY, LB_DEFAULT_SCOPE, LB_DEFAULT_WINDOW),
            userId,
            universalScore.avg_score,
          )
        : Promise.resolve(),
      // Invalidate widget cache for all affected boards
      ...sportIds.map((id) => this.readService.invalidateWidgetCache(id)),
      this.readService.invalidateWidgetCache(undefined),
    ]);

    this.logger.log(
      `User ${userId} rebuilt across ${sportScores.length} sport board(s) + universal`,
    );
  }
}
