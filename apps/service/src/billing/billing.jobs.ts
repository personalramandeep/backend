import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from '../payments/payments.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

/**
 * TODO: Replace cron with BullMQ scheduled jobs for distributed execution,
 */
@Injectable()
export class BillingJobs {
  private readonly logger = new Logger(BillingJobs.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runSubscriptionExpiry(): Promise<void> {
    this.logger.log('Running subscription expiry job');
    const expired = await this.subscriptionsService.expireDueSubscriptions();
    if (expired > 0) {
      this.logger.log(`Expired ${expired} subscriptions`);
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runStaleOrderCleanup(): Promise<void> {
    const cleaned = await this.paymentsService.expireStaleOrders();
    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} stale pending payment orders`);
    }
  }
}
