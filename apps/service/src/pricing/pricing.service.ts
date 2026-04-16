import { PlanEntity } from '@app/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PlanCapability } from './pricing.types';
import { PlanFeatureRepository } from './repositories/plan-feature.repository';
import { PlanRepository } from './repositories/plan.repository';
import { PriceRepository } from './repositories/price.repository';

@Injectable()
export class PricingService {
  constructor(
    private readonly planRepo: PlanRepository,
    private readonly planFeatureRepo: PlanFeatureRepository,
    private readonly priceRepo: PriceRepository,
  ) {}

  async getAllActivePlans(): Promise<PlanEntity[]> {
    const plans = await this.planRepo.findAllPublicActive();
    plans.forEach((plan) => {
      plan.plan_features?.sort(
        (a, b) => (a.feature?.sort_order ?? 0) - (b.feature?.sort_order ?? 0),
      );
    });
    return plans;
  }

  async getPlanBySlug(slug: string): Promise<PlanEntity> {
    const plan = await this.planRepo.findBySlug(slug);
    if (!plan) throw new NotFoundException(`Plan '${slug}' not found`);
    return plan;
  }

  async getPlanById(id: string): Promise<PlanEntity> {
    const plan = await this.planRepo.findById(id);
    if (!plan) throw new NotFoundException(`Plan '${id}' not found`);
    return plan;
  }

  async getPlanCapabilities(planId: string): Promise<Record<string, PlanCapability>> {
    const features = await this.planFeatureRepo.findByPlan(planId);
    return Object.fromEntries(
      features.map((pf): [string, PlanCapability] => [
        pf.feature.key,
        {
          enabled: pf.is_enabled,
          limit: pf.limit_value,
          label: pf.feature.label,
          display_label: pf.display_label,
          quota_reset_period: pf.quota_reset_period,
        },
      ]),
    );
  }

  async getFreePlan(): Promise<PlanEntity> {
    const plan = await this.planRepo.findFreePlan();
    if (!plan) throw new NotFoundException('Free plan not configured in database');
    return plan;
  }

  async getPriceById(id: string) {
    const price = await this.priceRepo.findById(id);
    if (!price) throw new NotFoundException(`Price '${id}' not found or not active`);
    return price;
  }
}
