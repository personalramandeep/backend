import { EBillingInterval, SubscriptionEntity } from '@app/common';
import { ConflictException, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { IUpgradeStrategy } from './upgrade-strategy.interface';

@Injectable()
export class BlockUpgradeStrategy implements IUpgradeStrategy {
  async executeUpgrade(
    interval: EBillingInterval,
    existingSubscription: SubscriptionEntity | null,
  ): Promise<{ periodStart: Date; periodEnd: Date }> {
    if (existingSubscription) {
      throw new ConflictException('Active subscription already exists');
    }

    const now = DateTime.utc();
    let periodEnd = now;

    switch (interval) {
      case EBillingInterval.ONE_TIME:
        periodEnd = now.plus({ days: 30 });
        break;
      case EBillingInterval.MONTHLY:
        periodEnd = now.plus({ months: 1 });
        break;
      case EBillingInterval.YEARLY:
        periodEnd = now.plus({ years: 1 });
        break;
    }

    return {
      periodStart: now.toJSDate(),
      periodEnd: periodEnd.toJSDate(),
    };
  }
}
