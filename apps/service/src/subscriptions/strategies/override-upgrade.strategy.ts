import { EBillingInterval, ESubscriptionStatus, SubscriptionEntity } from '@app/common';
import { Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import { EntityManager } from 'typeorm';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { IUpgradeStrategy } from './upgrade-strategy.interface';

@Injectable()
export class OverrideUpgradeStrategy implements IUpgradeStrategy {
  private readonly logger = new Logger(OverrideUpgradeStrategy.name);

  constructor(private readonly subscriptionRepo: SubscriptionRepository) {}

  async executeUpgrade(
    interval: EBillingInterval,
    existingSubscription: SubscriptionEntity | null,
    entityManager?: EntityManager,
  ): Promise<{ periodStart: Date; periodEnd: Date }> {
    const now = DateTime.utc();

    if (existingSubscription) {
      const updateData = {
        status: ESubscriptionStatus.EXPIRED,
        ended_at: now.toJSDate(),
      };
      
      if (entityManager) {
        await entityManager.update(SubscriptionEntity, existingSubscription.id, updateData);
      } else {
        await this.subscriptionRepo.update(existingSubscription.id, updateData);
      }
      this.logger.log(`Expired previous subscription ${existingSubscription.id} (OVERRIDE)`);
    }

    const periodStart = now;
    let periodEnd = periodStart;

    switch (interval) {
      case EBillingInterval.ONE_TIME:
        periodEnd = periodStart.plus({ days: 30 });
        break;
      case EBillingInterval.MONTHLY:
        periodEnd = periodStart.plus({ months: 1 });
        break;
      case EBillingInterval.YEARLY:
        periodEnd = periodStart.plus({ years: 1 });
        break;
    }

    return {
      periodStart: periodStart.toJSDate(),
      periodEnd: periodEnd.toJSDate(),
    };
  }
}
