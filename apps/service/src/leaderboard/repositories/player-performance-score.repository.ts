import { PlayerPerformanceScoreEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

@Injectable()
export class PlayerPerformanceScoreRepository {
  constructor(
    @InjectRepository(PlayerPerformanceScoreEntity)
    private readonly repo: Repository<PlayerPerformanceScoreEntity>,

    private readonly dataSource: DataSource,
  ) {}

  findByUserId(userId: string): Promise<PlayerPerformanceScoreEntity[]> {
    return this.repo.find({ where: { user_id: userId } });
  }

  findBySportId(sportId: string): Promise<PlayerPerformanceScoreEntity[]> {
    return this.repo.find({
      where: { sport_id: sportId },
      order: { avg_score: 'DESC' },
    });
  }

  findByUserAndSport(
    userId: string,
    sportId: string,
  ): Promise<PlayerPerformanceScoreEntity | null> {
    return this.repo.findOne({ where: { user_id: userId, sport_id: sportId } });
  }

  async upsertRunningAverage(
    userId: string,
    sportId: string,
    newScore: number,
  ): Promise<PlayerPerformanceScoreEntity> {
    const result = await this.dataSource.query<PlayerPerformanceScoreEntity[]>(
      `
      INSERT INTO player_performance_scores
        (id, user_id, sport_id, avg_score, prev_avg_score, video_count, last_updated_at, version, created_at, updated_at)
      VALUES
        (gen_random_uuid(), $1, $2, $3, 0, 1, NOW(), 1, NOW(), NOW())
      ON CONFLICT (user_id, sport_id) DO UPDATE
        SET
          prev_avg_score  = player_performance_scores.avg_score,
          avg_score       = 
            (player_performance_scores.avg_score * player_performance_scores.video_count + $3)
            / (player_performance_scores.video_count + 1),
          video_count     = player_performance_scores.video_count + 1,
          last_updated_at = NOW(),
          version         = player_performance_scores.version + 1,
          updated_at      = NOW()
      RETURNING *
      `,
      [userId, sportId, newScore],
    );
    return result[0];
  }

  findAllForUser(userId: string): Promise<PlayerPerformanceScoreEntity[]> {
    return this.repo.find({ where: { user_id: userId } });
  }

  findByUserIdsAndSport(
    userIds: string[],
    sportId: string,
  ): Promise<PlayerPerformanceScoreEntity[]> {
    if (!userIds.length) return Promise.resolve([]);
    return this.repo.findBy({ user_id: In(userIds), sport_id: sportId });
  }

  findBySportIdPage(
    sportId: string,
    skip: number,
    take: number,
  ): Promise<PlayerPerformanceScoreEntity[]> {
    return this.repo.find({
      where: { sport_id: sportId },
      order: { avg_score: 'DESC' },
      skip,
      take,
    });
  }

  async findDistinctSports(): Promise<string[]> {
    const rows = await this.dataSource.query<{ sport_id: string }[]>(
      `SELECT DISTINCT sport_id FROM player_performance_scores`,
    );
    return rows.map((r) => r.sport_id);
  }
}
