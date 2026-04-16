import { EPerformanceEventStatus } from '@app/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PlayerPerformanceEventRepository } from '../repositories/player-performance-event.repository';
import { PlayerPerformanceScoreRepository } from '../repositories/player-performance-score.repository';
import { PlayerSkillScoreRepository } from '../repositories/player-skill-score.repository';
import { UniversalPerformanceScoreRepository } from '../repositories/universal-performance-score.repository';
import { LeaderboardReadService } from '../services/leaderboard-read.service';
import {
  LeaderboardRedisService,
  UNIVERSAL_SPORT_KEY,
} from '../services/leaderboard-redis.service';
import { LEADERBOARD_JOB_APPLY, LEADERBOARD_QUEUE } from '../services/leaderboard-write.service';
import { ConfigService } from '../../config/config.service';

interface PerformanceApplyJobData {
  eventId: string;
}

@Injectable()
@Processor(LEADERBOARD_QUEUE)
export class PerformanceApplyProcessor extends WorkerHost {
  private readonly logger = new Logger(PerformanceApplyProcessor.name);
  private readonly SUSPICIOUS_SCORE_DELTA_THRESHOLD = 40;

  constructor(
    private readonly eventRepo: PlayerPerformanceEventRepository,
    private readonly perfScoreRepo: PlayerPerformanceScoreRepository,
    private readonly skillScoreRepo: PlayerSkillScoreRepository,
    private readonly universalScoreRepo: UniversalPerformanceScoreRepository,
    private readonly redisService: LeaderboardRedisService,
    private readonly readService: LeaderboardReadService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<PerformanceApplyJobData>): Promise<void> {
    if (job.name !== LEADERBOARD_JOB_APPLY) {
      this.logger.warn(`Unknown job name on leaderboard queue: ${job.name}`);
      return;
    }

    const { eventId } = job.data;
    const event = await this.eventRepo.findById(eventId);

    if (!event) {
      this.logger.warn(`Event not found: ${eventId} — skipping`);
      return;
    }

    if (
      event.status === EPerformanceEventStatus.APPLIED ||
      event.status === EPerformanceEventStatus.DUPLICATE
    ) {
      this.logger.log(`Event ${eventId} already processed (${event.status}) — skipping`);
      return;
    }

    // TODO: future
    // Anti-cheat: check for suspicious score delta vs current average
    // const currentScore = await this.perfScoreRepo.findByUserAndSport(event.user_id, event.sport_id);
    // if (currentScore && currentScore.video_count > 0) {
    //   const delta = Math.abs(event.score - currentScore.avg_score);
    //   if (delta > this.SUSPICIOUS_SCORE_DELTA_THRESHOLD) {
    //     this.logger.warn(
    //       `Suspicious score delta ${delta.toFixed(1)} for user ${event.user_id} ` +
    //         `(current avg: ${currentScore.avg_score.toFixed(1)}, new: ${event.score}) — rejecting event ${eventId}`,
    //     );
    //     await this.eventRepo.markRejected(eventId);
    //     return;
    //   }
    // }

    try {
      const updatedScore = await this.perfScoreRepo.upsertRunningAverage(
        event.user_id,
        event.sport_id,
        event.score,
      );

      if (event.skill_scores && Object.keys(event.skill_scores).length > 0) {
        await this.skillScoreRepo.upsertMany(event.user_id, event.sport_id, event.skill_scores);
      }

      const allSportScores = await this.perfScoreRepo.findAllForUser(event.user_id);
      const universalAvg =
        allSportScores.reduce((sum, s) => sum + s.avg_score, 0) / allSportScores.length;
      const totalVideos = allSportScores.reduce((sum, s) => sum + s.video_count, 0);
      await this.universalScoreRepo.upsertFromSportScores(event.user_id, universalAvg, totalVideos);

      await this.eventRepo.markApplied(eventId);

      this.logger.log(
        `Performance event ${eventId} applied — ` +
          `user: ${event.user_id}, sport: ${event.sport_id}, score: ${event.score}`,
      );

      this.syncRedisAfterApply(
        event.user_id,
        event.sport_id,
        updatedScore.avg_score,
        universalAvg,
      ).catch((err) =>
        this.logger.error(`Redis sync failed for event ${eventId}: ${(err as Error).message}`),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to apply performance event ${eventId}: ${msg}`);
      // Let Queue handle retry
      throw err;
    }
  }

  private async syncRedisAfterApply(
    userId: string,
    sportId: string,
    sportAvg: number,
    universalAvg: number,
  ): Promise<void> {
    const univKey = this.redisService.buildKey(UNIVERSAL_SPORT_KEY);

    const tasks: Promise<unknown>[] = [
      this.redisService.zadd(univKey, userId, universalAvg),
      this.readService.invalidateWidgetCache(undefined),
    ];

    if (this.configService.sportLeaderboardEnabled) {
      const sportKey = this.redisService.buildKey(sportId);
      tasks.push(
        this.redisService.zadd(sportKey, userId, sportAvg),
        this.readService.invalidateWidgetCache(sportId),
      );
    }

    await Promise.all(tasks);
  }
}
