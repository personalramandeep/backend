import { EBillingInterval, SubscriptionEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { IUpgradeStrategy } from './upgrade-strategy.interface';

@Injectable()
export class ChainingUpgradeStrategy implements IUpgradeStrategy {
  async executeUpgrade(
    interval: EBillingInterval,
    existingSubscription: SubscriptionEntity | null,
  ): Promise<{ periodStart: Date; periodEnd: Date }> {
    const now = DateTime.utc();
    let periodStart = now;

    if (existingSubscription) {
      periodStart = DateTime.fromJSDate(existingSubscription.current_period_end) as DateTime<true>;
    }

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
