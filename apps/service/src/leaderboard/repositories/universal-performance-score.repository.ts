import { UniversalPerformanceScoreEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

@Injectable()
export class UniversalPerformanceScoreRepository {
  constructor(
    @InjectRepository(UniversalPerformanceScoreEntity)
    private readonly repo: Repository<UniversalPerformanceScoreEntity>,

    private readonly dataSource: DataSource,
  ) {}

  findByUserId(userId: string): Promise<UniversalPerformanceScoreEntity | null> {
    return this.repo.findOne({ where: { user_id: userId } });
  }

  findByUserIds(userIds: string[]): Promise<UniversalPerformanceScoreEntity[]> {
    if (!userIds.length) return Promise.resolve([]);
    return this.repo.findBy({ user_id: In(userIds) });
  }

  findAll(): Promise<UniversalPerformanceScoreEntity[]> {
    return this.repo.find({ order: { avg_score: 'DESC' } });
  }

  findPage(skip: number, take: number): Promise<UniversalPerformanceScoreEntity[]> {
    return this.repo.find({ order: { avg_score: 'DESC' }, skip, take });
  }

  async upsertFromSportScores(
    userId: string,
    newAvgScore: number,
    newVideoCount: number,
  ): Promise<void> {
    await this.dataSource.query(
      `
      INSERT INTO universal_performance_scores
        (id, user_id, avg_score, prev_avg_score, video_count,
         last_updated_at, version, created_at, updated_at)
      VALUES
        (gen_random_uuid(), $1, $2, 0, $3, NOW(), 1, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET
          prev_avg_score  = universal_performance_scores.avg_score,
          avg_score       = $2,
          video_count     = $3,
          last_updated_at = NOW(),
          version         = universal_performance_scores.version + 1,
          updated_at      = NOW()
      `,
      [userId, newAvgScore, newVideoCount],
    );
  }
}
