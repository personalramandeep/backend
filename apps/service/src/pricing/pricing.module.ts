import {
  FeatureEntity,
  PlanEntity,
  PlanFeatureEntity,
  PriceEntity,
  ProductEntity,
} from '@app/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PlanFeatureRepository } from './repositories/plan-feature.repository';
import { PlanRepository } from './repositories/plan.repository';
import { PriceRepository } from './repositories/price.repository';

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
  controllers: [PricingController],
  providers: [PricingService, PlanRepository, PlanFeatureRepository, PriceRepository],
  exports: [PricingService, PlanRepository, PlanFeatureRepository, PriceRepository],
})
export class PricingModule {}
