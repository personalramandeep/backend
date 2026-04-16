import { SubscriptionEntity } from '@app/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { BlockUpgradeStrategy } from './strategies/block-upgrade.strategy';
import { ChainingUpgradeStrategy } from './strategies/chaining-upgrade.strategy';
import { OverrideUpgradeStrategy } from './strategies/override-upgrade.strategy';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionEntity])],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionRepository,
    BlockUpgradeStrategy,
    ChainingUpgradeStrategy,
    OverrideUpgradeStrategy,
    {
      provide: 'UPGRADE_STRATEGY',
      useClass: ChainingUpgradeStrategy,
    },
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
