import { FEATURE_KEYS } from '@app/common';
import { Injectable, Logger } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { ConfigService } from '../config/config.service';
import { IReferralStats } from './referral.types';
import { ReferralRepository } from './repositories/referral.repository';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  private baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly repo: ReferralRepository,
  ) {
    this.baseUrl = this.configService.get('APP_LANDING_URL');
  }

  generateCode(): string {
    // avoid look-alike characters (0, O, I, l, 1)
    const idGenerator = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 8);
    return idGenerator();
  }

  async getOrCreateCode(userId: string): Promise<{ code: string; link: string }> {
    let row = await this.repo.findCodeByUserId(userId);

    if (!row) {
      const rawCode = this.generateCode();
      row = await this.repo.upsertCode(userId, rawCode);
    }

    return {
      code: row.code,
      link: `${this.baseUrl}?ref=${row.code}`,
    };
  }

  async applyReferral(referredUserId: string, referralCode?: string): Promise<void> {
    if (!referralCode) return;

    try {
      const codeRow = await this.repo.findCodeByCode(referralCode);
      if (!codeRow) {
        this.logger.debug(`Invalid referral code provided: ${referralCode}`);
        return;
      }

      const referrerId = codeRow.user_id;

      if (referrerId === referredUserId) {
        this.logger.debug(`Self-referral prevented for user: ${referrerId}`);
        return;
      }

      const referral = await this.repo.claimReferral(referrerId, referredUserId);

      if (referral) {
        await this.grantReward(referrerId, referral.id);
        this.logger.log(`Referral applied: ${referrerId} referred ${referredUserId}`);
      }
    } catch (error) {
      this.logger.error('Failed to apply referral', error);
    }
  }

  private async grantReward(referrerId: string, referralId: string): Promise<void> {
    await this.repo.incrementBonus(referrerId, FEATURE_KEYS.VIDEO_ANALYSES);
    await this.repo.setRewardGranted(referralId);
  }

  async getReferralStats(userId: string): Promise<IReferralStats> {
    const { code, link } = await this.getOrCreateCode(userId);
    const referralCount = await this.repo.countSuccessfulReferrals(userId);

    return { code, link, referralCount };
  }

  async validateCode(code: string): Promise<{ valid: boolean; referrerName?: string }> {
    const codeRow = await this.repo.findCodeByCode(code);
    if (!codeRow) {
      return { valid: false };
    }
    return { valid: true, referrerName: codeRow.user.full_name };
  }

  async getBonusCount(userId: string, featureKey: string): Promise<number> {
    return this.repo.getBonusCount(userId, featureKey);
  }
}
