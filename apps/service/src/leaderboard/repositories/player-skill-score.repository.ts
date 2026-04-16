import { PlayerSkillScoreEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class PlayerSkillScoreRepository {
  constructor(
    @InjectRepository(PlayerSkillScoreEntity)
    private readonly repo: Repository<PlayerSkillScoreEntity>,

    private readonly dataSource: DataSource,
  ) {}

  findByUserAndSport(userId: string, sportId: string): Promise<PlayerSkillScoreEntity[]> {
    return this.repo.find({ where: { user_id: userId, sport_id: sportId } });
  }

  async upsertMany(
    userId: string,
    sportId: string,
    skillScores: Record<string, number>,
  ): Promise<void> {
    const entries = Object.entries(skillScores);
    if (!entries.length) return;

    const metricKeys = entries.map(([k]) => k);
    const scores = entries.map(([, v]) => v);

    await this.dataSource.query(
      `
      INSERT INTO player_skill_scores
        (id, user_id, sport_id, metric_key, avg_score, video_count, last_updated_at)
      SELECT
        gen_random_uuid(),
        $1,
        $2,
        unnest($3::text[]),
        unnest($4::float8[]),
        1,
        NOW()
      ON CONFLICT (user_id, sport_id, metric_key) DO UPDATE
        SET
          avg_score       = (player_skill_scores.avg_score * player_skill_scores.video_count + EXCLUDED.avg_score)
                            / (player_skill_scores.video_count + 1),
          video_count     = player_skill_scores.video_count + 1,
          last_updated_at = NOW()
      `,
      [userId, sportId, metricKeys, scores],
    );
  }
}
