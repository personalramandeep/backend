import { QuotaUsageEntity } from '@app/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingModule } from '../pricing/pricing.module';
import { ReferralModule } from '../referral/referral.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EntitlementService } from './entitlement.service';
import { EntitlementsController } from './entitlements.controller';
import { EntitlementGuard } from './guards/entitlement.guard';
import { QuotaUsageService } from './quota-usage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuotaUsageEntity]),
    PricingModule,
    SubscriptionsModule,
    ReferralModule,
  ],
  controllers: [EntitlementsController],
  providers: [EntitlementService, EntitlementGuard, QuotaUsageService],
  exports: [EntitlementService, EntitlementGuard, QuotaUsageService],
})
export class EntitlementsModule {}
