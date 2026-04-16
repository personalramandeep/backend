import { EQuotaResetPeriod, SubscriptionEntity } from '@app/common';
import { Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PricingService } from '../pricing/pricing.service';
import { PlanFeatureRepository } from '../pricing/repositories/plan-feature.repository';
import { ReferralService } from '../referral/referral.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EntitlementResult } from './entitlement.types';
import { QuotaUsageService } from './quota-usage.service';

@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly pricingService: PricingService,
    private readonly planFeatureRepo: PlanFeatureRepository,
    private readonly quotaUsageService: QuotaUsageService,
    private readonly referralService: ReferralService,
  ) {}

  private resolvePeriodWindow(
    resetPeriod: EQuotaResetPeriod | null,
    sub: SubscriptionEntity | null,
  ): { periodStart: Date; periodEnd: Date } {
    const now = DateTime.utc();

    if (resetPeriod === EQuotaResetPeriod.DAILY) {
      return {
        periodStart: now.startOf('day').toJSDate(),
        periodEnd: now.startOf('day').plus({ days: 1 }).toJSDate(),
      };
    }

    if (resetPeriod === EQuotaResetPeriod.MONTHLY) {
      return {
        periodStart: now.startOf('month').toJSDate(),
        periodEnd: now.startOf('month').plus({ months: 1 }).toJSDate(),
      };
    }

    // PER_SUBSCRIPTION
    if (sub) {
      return { periodStart: sub.current_period_start, periodEnd: sub.current_period_end };
    }

    return {
      periodStart: now.startOf('month').toJSDate(),
      periodEnd: now.startOf('month').plus({ months: 1 }).toJSDate(),
    };
  }

  async canAccess(
    userId: string,
    featureKey: string,
    consume: boolean = false,
  ): Promise<EntitlementResult> {
    const sub = await this.subscriptionsService.getActiveSubscription(userId);
    let planId: string;

    if (sub) {
      planId = sub.plan_id;
    } else {
      const freePlan = await this.pricingService.getFreePlan();
      planId = freePlan.id;
    }

    const planFeature = await this.planFeatureRepo.findByPlanAndKey(planId, featureKey);
    if (!planFeature || !planFeature.is_enabled) {
      return { allowed: false, reason: 'NOT_IN_PLAN' };
    }

    // Boolean feature — no quota check needed
    if (planFeature.limit_value === null) {
      return { allowed: true };
    }

    // Unlimited feature (-1 sentinel)
    if (planFeature.limit_value === -1) {
      return { allowed: true };
    }

    const { periodStart: pStart, periodEnd: pEnd } = this.resolvePeriodWindow(
      planFeature.quota_reset_period,
      sub,
    );

    const bonusCount = await this.referralService.getBonusCount(userId, featureKey);
    const effectiveLimit = planFeature.limit_value + bonusCount;

    const used = await this.quotaUsageService.getUsed(userId, featureKey, pStart);
    if (used >= effectiveLimit) {
      return {
        allowed: false,
        reason: 'QUOTA_EXCEEDED',
        used,
        limit: effectiveLimit,
        resetAt: pEnd,
      };
    }

    if (consume) {
      const success = await this.quotaUsageService.consume(
        userId,
        featureKey,
        pStart,
        pEnd,
        effectiveLimit,
      );

      if (!success) {
        return {
          allowed: false,
          reason: 'QUOTA_EXCEEDED',
          used: effectiveLimit,
          limit: effectiveLimit,
          resetAt: pEnd,
        };
      }

      return {
        allowed: true,
        used: used + 1,
        limit: effectiveLimit,
        periodStart: pStart,
        periodEnd: pEnd,
      };
    }

    return {
      allowed: true,
      used,
      limit: effectiveLimit,
      periodStart: pStart,
      periodEnd: pEnd,
    };
  }

  async getMyCapabilities(userId: string): Promise<Record<string, unknown>> {
    const sub = await this.subscriptionsService.getActiveSubscription(userId);
    const planId = sub?.plan_id ?? (await this.pricingService.getFreePlan()).id;
    return this.pricingService.getPlanCapabilities(planId);
  }
}
