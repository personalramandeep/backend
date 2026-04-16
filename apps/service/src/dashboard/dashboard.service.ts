import { Injectable } from '@nestjs/common';
import { LB_DEFAULT_SCOPE, LB_DEFAULT_WINDOW } from '../leaderboard/leaderboard.constants';
import { PlayerPerformanceEventRepository } from '../leaderboard/repositories/player-performance-event.repository';
import { UniversalPerformanceScoreRepository } from '../leaderboard/repositories/universal-performance-score.repository';
import {
  LeaderboardRedisService,
  UNIVERSAL_SPORT_KEY,
} from '../leaderboard/services/leaderboard-redis.service';
import { ImprovementWindow } from '../players/dtos/improvement-result.dto';
import { PlayerMetricsService } from '../players/services/player-metrics.service';
import { PostRepository } from '../post/repositories/post.repository';
import { StreakService } from '../streak/streak.service';

export interface DashboardStatsDto {
  total_videos: number;
  avg_ai_score: number | null;
  rank: number | null;
  /** Total players in the universal leaderboard. */
  total_players: number;
  /** Current upload streak count. 0 if streak is broken. */
  streak: number;
  /** Whether the streak is currently active (uploaded today or yesterday). */
  is_streak_active: boolean;
  improvement_pct: number;
  improvement_window: ImprovementWindow;
  /** False = not enough data */
  improvement_has_data: boolean;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly universalScoreRepo: UniversalPerformanceScoreRepository,
    private readonly lbRedis: LeaderboardRedisService,
    private readonly streakService: StreakService,
    private readonly perfEventRepo: PlayerPerformanceEventRepository,
    private readonly playerMetricsService: PlayerMetricsService,
  ) {}

  async getStats(userId: string): Promise<DashboardStatsDto> {
    const lbKey = this.lbRedis.buildKey(UNIVERSAL_SPORT_KEY, LB_DEFAULT_SCOPE, LB_DEFAULT_WINDOW);

    const [totalVideos, scoreMeta, rank0, totalPlayers, streakSummary, firstScore] =
      await Promise.all([
        this.postRepository.countByUserId(userId),
        this.universalScoreRepo.findByUserId(userId),
        this.lbRedis.zrevrank(lbKey, userId),
        this.lbRedis.zcard(lbKey),
        this.streakService.getStreakSummary(userId),
        this.perfEventRepo.firstScoreForUser(userId),
      ]);

    // Rank (1-indexed)
    const rank = rank0 !== null ? rank0 + 1 : null;

    // AI score
    const currentAvg = scoreMeta?.avg_score ?? null;

    const improvementPct = this.playerMetricsService.computeImprovementPct(currentAvg, firstScore);
    const improvementHasData = firstScore !== null && currentAvg !== null;

    return {
      total_videos: totalVideos,
      avg_ai_score: currentAvg !== null ? Math.round(currentAvg * 10) / 10 : null,
      rank,
      total_players: totalPlayers,
      streak: streakSummary.current_count,
      is_streak_active: streakSummary.is_active,
      improvement_pct: improvementPct,
      improvement_window: 'overall',
      improvement_has_data: improvementHasData,
    };
  }
}
