import {
  FeatureEntity,
  PlanEntity,
  PlanFeatureEntity,
  PriceEntity,
  ProductEntity,
} from '@app/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingSeeder } from '../../seed/seeders/billing.seeder';
import { AdminBillingController } from './admin-billing.controller';
import { AdminBillingService } from './admin-billing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductEntity,
      PlanEntity,
      PriceEntity,
      FeatureEntity,
      PlanFeatureEntity,
    ]),
  ],
  controllers: [AdminBillingController],
  providers: [AdminBillingService, BillingSeeder],
})
export class AdminBillingModule {}
