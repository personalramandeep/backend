import { EPerformanceEventStatus, PlayerPerformanceEventEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class PlayerPerformanceEventRepository {
  constructor(
    @InjectRepository(PlayerPerformanceEventEntity)
    private readonly repo: Repository<PlayerPerformanceEventEntity>,

    private readonly dataSource: DataSource,
  ) {}

  findById(id: string): Promise<PlayerPerformanceEventEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findBySourceEventId(sourceEventId: string): Promise<PlayerPerformanceEventEntity | null> {
    return this.repo.findOne({ where: { source_event_id: sourceEventId } });
  }

  async insertIfNew(data: {
    userId: string;
    sportId: string;
    sourceEventId: string;
    score: number;
    skillScores: Record<string, number> | null;
  }): Promise<{ entity: PlayerPerformanceEventEntity; created: boolean }> {
    const result = await this.dataSource.query<PlayerPerformanceEventEntity[]>(
      `
      INSERT INTO player_performance_events
        (id, user_id, sport_id, source_event_id, score, skill_scores, status, created_at)
      VALUES
        (gen_random_uuid(), $1, $2, $3, $4, $5, 'pending', NOW())
      ON CONFLICT (source_event_id) DO NOTHING
      RETURNING *
      `,
      [data.userId, data.sportId, data.sourceEventId, data.score, data.skillScores ?? null],
    );

    if (result.length > 0) {
      return { entity: result[0], created: true };
    }

    const existing = await this.findBySourceEventId(data.sourceEventId);
    return { entity: existing!, created: false };
  }

  async markApplied(id: string): Promise<void> {
    await this.repo.update(id, {
      status: EPerformanceEventStatus.APPLIED,
      applied_at: DateTime.utc().toJSDate(),
    });
  }

  async markDuplicate(id: string): Promise<void> {
    await this.repo.update(id, { status: EPerformanceEventStatus.DUPLICATE });
  }

  async markRejected(id: string): Promise<void> {
    await this.repo.update(id, { status: EPerformanceEventStatus.REJECTED });
  }

  async firstScoreForUser(userId: string): Promise<number | null> {
    const event = await this.repo.findOne({
      where: { user_id: userId, status: EPerformanceEventStatus.APPLIED },
      select: { score: true },
      order: { created_at: 'ASC' },
    });
    return event?.score ?? null;
  }

  findAppliedByUser(
    userId: string,
  ): Promise<Pick<PlayerPerformanceEventEntity, 'score' | 'created_at'>[]> {
    return this.repo.find({
      where: { user_id: userId, status: EPerformanceEventStatus.APPLIED },
      select: { score: true, created_at: true },
      order: { created_at: 'ASC' },
    });
  }
}
