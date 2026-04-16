import { ReferralBonusEntity, ReferralCodeEntity, ReferralEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ReferralRepository {
  constructor(
    @InjectRepository(ReferralCodeEntity)
    private readonly codeRepo: Repository<ReferralCodeEntity>,

    @InjectRepository(ReferralEntity)
    private readonly referralRepo: Repository<ReferralEntity>,

    @InjectRepository(ReferralBonusEntity)
    private readonly bonusRepo: Repository<ReferralBonusEntity>,

    private readonly dataSource: DataSource,
  ) {}

  async findCodeByUserId(userId: string): Promise<ReferralCodeEntity | null> {
    return this.codeRepo.findOne({ where: { user_id: userId } });
  }

  async findCodeByCode(code: string): Promise<ReferralCodeEntity | null> {
    return this.codeRepo.findOne({
      where: { code: code.toLowerCase() },
      relations: ['user'],
    });
  }

  async upsertCode(userId: string, code: string): Promise<ReferralCodeEntity> {
    const result = await this.dataSource.query<{ id: string }[]>(
      `
      INSERT INTO referral_codes (id, user_id, code, created_at)
      VALUES (gen_random_uuid(), $1, $2, NOW())
      ON CONFLICT (user_id) DO UPDATE SET code = referral_codes.code
      RETURNING *
      `,
      [userId, code.toLowerCase()],
    );
    return result[0] as ReferralCodeEntity;
  }

  async getReferralByReferredId(referredId: string): Promise<ReferralEntity | null> {
    return this.referralRepo.findOne({ where: { referred_id: referredId } });
  }

  async claimReferral(
    referrerId: string,
    referredId: string,
    metadata?: Record<string, unknown>,
  ): Promise<ReferralEntity | null> {
    const result = await this.dataSource.query<{ id: string }[]>(
      `
      INSERT INTO referrals (id, referrer_id, referred_id, metadata, reward_granted, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, false, NOW(), NOW())
      ON CONFLICT (referred_id) DO NOTHING
      RETURNING *
      `,
      [referrerId, referredId, metadata || null],
    );
    return result.length > 0 ? (result[0] as ReferralEntity) : null;
  }

  async setRewardGranted(referralId: string): Promise<void> {
    await this.referralRepo.update(referralId, { reward_granted: true });
  }

  async getBonusCount(userId: string, featureKey: string): Promise<number> {
    const row = await this.bonusRepo.findOne({
      where: { user_id: userId, feature_key: featureKey },
    });
    return row?.bonus_count ?? 0;
  }

  async incrementBonus(userId: string, featureKey: string): Promise<void> {
    await this.dataSource.query(
      `
      INSERT INTO referral_bonuses (id, user_id, feature_key, bonus_count, updated_at)
      VALUES (gen_random_uuid(), $1, $2, 1, NOW())
      ON CONFLICT (user_id, feature_key) DO UPDATE
      SET bonus_count = referral_bonuses.bonus_count + 1, updated_at = NOW()
      `,
      [userId, featureKey],
    );
  }

  async countSuccessfulReferrals(userId: string): Promise<number> {
    return this.referralRepo.count({
      where: { referrer_id: userId, reward_granted: true },
    });
  }
}
