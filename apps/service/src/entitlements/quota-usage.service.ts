import { QuotaUsageEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

/**
 * QuotaUsageService — tracks per-user, per-feature, per-period usage counts.
 */
@Injectable()
export class QuotaUsageService {
  constructor(
    @InjectRepository(QuotaUsageEntity) private readonly repo: Repository<QuotaUsageEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async getUsed(userId: string, featureKey: string, periodStart: Date): Promise<number> {
    const row = await this.repo.findOne({
      where: {
        user_id: userId,
        feature_key: featureKey,
        period_start: periodStart,
      },
    });
    return row?.used_count ?? 0;
  }

  async increment(
    userId: string,
    featureKey: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    await this.dataSource.query(
      `
        INSERT INTO quota_usage (id, user_id, feature_key, period_start, period_end, used_count, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 1, NOW(), NOW())
        ON CONFLICT (user_id, feature_key, period_start)
        DO UPDATE
          SET used_count = quota_usage.used_count + 1,
          updated_at = NOW()
      `,
      [userId, featureKey, periodStart, periodEnd],
    );
  }

  /**
   * consumes 1 unit of quota
   * Extinguishes TOCTOU vulnerability
   * TODO: Redis
   */
  async consume(
    userId: string,
    featureKey: string,
    periodStart: Date,
    periodEnd: Date,
    limitValue: number,
  ): Promise<boolean> {
    if (limitValue <= 0) return false;

    const result = await this.dataSource.query<{ used_count: number }[]>(
      `
        INSERT INTO quota_usage (id, user_id, feature_key, period_start, period_end, used_count, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 1, NOW(), NOW())
        ON CONFLICT (user_id, feature_key, period_start)
        DO UPDATE SET 
          used_count = quota_usage.used_count + 1, 
          updated_at = NOW()
        WHERE quota_usage.used_count < $5
        RETURNING used_count
      `,
      [userId, featureKey, periodStart, periodEnd, limitValue],
    );

    return result.length > 0;
  }
}
