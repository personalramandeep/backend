import { EBillingInterval, SubscriptionEntity } from '@app/common';
import { EntityManager } from 'typeorm';

export interface IUpgradeStrategy {
  /**
   * Handles an upgrade event, returning the determined start and end periods for the NEW subscription.
   * Can perform side effects like expiring the existing subscription if required.
   */
  executeUpgrade(
    interval: EBillingInterval,
    existingSubscription: SubscriptionEntity | null,
    entityManager?: EntityManager,
  ): Promise<{ periodStart: Date; periodEnd: Date }>;
}
