import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { PricingModule } from '../pricing/pricing.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BillingController } from './billing.controller';
import { BillingJobs } from './billing.jobs';
import { BillingOrchestrator } from './billing.orchestrator';

@Module({
  imports: [
    PaymentsModule,
    PricingModule,
    SubscriptionsModule,
  ],
  controllers: [BillingController],
  providers: [BillingOrchestrator, BillingJobs],
  exports: [BillingOrchestrator],
})
export class BillingModule {}
