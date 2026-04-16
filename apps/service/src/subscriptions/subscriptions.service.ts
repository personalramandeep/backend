import {
  ESubscriptionStatus,
  PlanEntity,
  PriceEntity,
  SubscriptionEntity,
} from '@app/common';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { EntityManager } from 'typeorm';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { IUpgradeStrategy } from './strategies/upgrade-strategy.interface';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    @Inject('UPGRADE_STRATEGY') private readonly upgradeStrategy: IUpgradeStrategy,
  ) {}

  async getActiveSubscription(userId: string): Promise<SubscriptionEntity | null> {
    return this.subscriptionRepo.findActiveByUserId(userId);
  }

  /**
   * Activate a new subscription after successful payment.
   * For one-time payments: period is 30 days from now.
   * For recurring: period will come from provider webhook.
   */
  async activate(params: {
    userId: string;
    plan: PlanEntity;
    price: PriceEntity;
    paymentOrderId?: string;
    entityManager?: EntityManager;
  }): Promise<SubscriptionEntity> {
    const em = params.entityManager;

    const existing = await this.subscriptionRepo.findActiveByUserId(params.userId);

    const { periodStart, periodEnd } = await this.upgradeStrategy.executeUpgrade(
      params.price.billing_interval,
      existing,
      em,
    );

    const createData = {
      user_id: params.userId,
      plan_id: params.plan.id,
      price_id: params.price.id,
      status: ESubscriptionStatus.ACTIVE,
      started_at: periodStart,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
    };

    let sub: SubscriptionEntity;
    if (em) {
      sub = await em.save(SubscriptionEntity, em.create(SubscriptionEntity, createData));
    } else {
      sub = await this.subscriptionRepo.create(createData);
    }

    this.logger.log(
      `Activated subscription ${sub.id} for user ${params.userId} on plan ${params.plan.slug}`,
    );
    return sub;
  }

  async cancelAtPeriodEnd(userId: string): Promise<SubscriptionEntity> {
    const sub = await this.subscriptionRepo.findActiveByUserId(userId);
    if (!sub) throw new NotFoundException('No active subscription found');

    await this.subscriptionRepo.update(sub.id, {
      cancel_at_period_end: true,
      cancelled_at: DateTime.utc().toJSDate(),
    });

    this.logger.log(`Subscription ${sub.id} marked for cancellation at period end`);
    return { ...sub, cancel_at_period_end: true };
  }

  async expireDueSubscriptions(): Promise<number> {
    const affectedCount = await this.subscriptionRepo.updateExpiredCancelledBulk();

    if (affectedCount > 0) {
      this.logger.log(`Expired ${affectedCount} subscriptions at period end`);
    }
    return affectedCount;
  }

  async findById(id: string): Promise<SubscriptionEntity | null> {
    return this.subscriptionRepo.findById(id);
  }

  async linkToPaymentOrder(subscriptionId: string, paymentOrderId: string): Promise<void> {
    // Update subscription in payment_orders is handled by billing orchestrator
  }
}
