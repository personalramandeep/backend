import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RecordPerformanceScoreDto } from '../dtos/record-performance-score.dto';
import { PlayerPerformanceEventRepository } from '../repositories/player-performance-event.repository';

export const LEADERBOARD_QUEUE = 'leaderboard';
export const LEADERBOARD_JOB_APPLY = 'performance.apply';

@Injectable()
export class LeaderboardWriteService {
  private readonly logger = new Logger(LeaderboardWriteService.name);

  constructor(
    private readonly eventRepo: PlayerPerformanceEventRepository,
    @InjectQueue(LEADERBOARD_QUEUE) private readonly queue: Queue,
  ) {}

  async ingestScore(
    userId: string,
    postId: string,
    dto: RecordPerformanceScoreDto,
  ): Promise<{ eventId: string; alreadyProcessed: boolean }> {
    const { entity, created } = await this.eventRepo.insertIfNew({
      userId,
      sportId: dto.sport_id,
      sourceEventId: postId,
      score: dto.score,
      skillScores: dto.skill_scores ?? null,
    });

    if (!created) {
      this.logger.log(`Duplicate performance score ignored for postId: ${postId}`);
      return { eventId: entity.id, alreadyProcessed: true };
    }

    await this.queue.add(
      LEADERBOARD_JOB_APPLY,
      { eventId: entity.id },
      {
        jobId: entity.id, // dedup
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Performance score event enqueued: ${entity.id} (postId: ${postId})`);
    return { eventId: entity.id, alreadyProcessed: false };
  }
}
