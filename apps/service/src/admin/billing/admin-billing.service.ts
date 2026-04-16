import {
  FeatureEntity,
  PlanEntity,
  PlanFeatureEntity,
  PriceEntity,
  ProductEntity,
} from '@app/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingSeeder } from '../../seed/seeders/billing.seeder';
import {
  CreateFeatureDto,
  CreatePlanDto,
  CreatePriceDto,
  UpdateFeatureDto,
  UpdatePlanDto,
  UpdatePlanFeatureDto,
  UpdatePriceDto,
  UpsertPlanFeatureDto,
} from './dtos/admin-billing.dto';

@Injectable()
export class AdminBillingService {
  constructor(
    @InjectRepository(ProductEntity) private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(PlanEntity) private readonly planRepo: Repository<PlanEntity>,
    @InjectRepository(FeatureEntity) private readonly featureRepo: Repository<FeatureEntity>,
    @InjectRepository(PlanFeatureEntity)
    private readonly planFeatureRepo: Repository<PlanFeatureEntity>,
    @InjectRepository(PriceEntity) private readonly priceRepo: Repository<PriceEntity>,
    private readonly billingSeeder: BillingSeeder,
  ) {}

  async listProducts(): Promise<ProductEntity[]> {
    return this.productRepo.find({
      relations: ['plans', 'plans.prices'],
      order: { created_at: 'ASC' },
    });
  }

  async listPlans(): Promise<PlanEntity[]> {
    const plans = await this.planRepo.find({
      relations: ['prices', 'plan_features', 'plan_features.feature', 'product'],
      order: { sort_order: 'ASC', created_at: 'DESC' },
    });
    // Sort each plan's features by feature.sort_order
    plans.forEach(plan => {
      plan.plan_features?.sort(
        (a, b) => (a.feature?.sort_order ?? 0) - (b.feature?.sort_order ?? 0),
      );
    });
    return plans;
  }

  async listFeatures(): Promise<FeatureEntity[]> {
    return this.featureRepo.find({ order: { sort_order: 'ASC', key: 'ASC' } });
  }

  async createPlan(productId: string, dto: CreatePlanDto): Promise<PlanEntity> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const plan = this.planRepo.create({
      product_id: product.id,
      ...dto,
      is_active: true,
      is_public: true,
    });
    return this.planRepo.save(plan);
  }

  async updatePlan(id: string, dto: UpdatePlanDto): Promise<PlanEntity> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  async upsertPlanFeature(planId: string, dto: UpsertPlanFeatureDto): Promise<PlanFeatureEntity> {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const feature = await this.featureRepo.findOne({ where: { id: dto.feature_id } });
    if (!feature) throw new NotFoundException('Feature not found');

    let relation = await this.planFeatureRepo.findOne({
      where: { plan_id: plan.id, feature_id: feature.id },
    });

    if (relation) {
      relation.is_enabled = dto.is_enabled;
      relation.limit_value = dto.limit_value ?? null;
      return this.planFeatureRepo.save(relation);
    } else {
      relation = this.planFeatureRepo.create({
        plan_id: plan.id,
        feature_id: feature.id,
        is_enabled: dto.is_enabled,
        limit_value: dto.limit_value ?? null,
      });
      return this.planFeatureRepo.save(relation);
    }
  }

  async removePlanFeature(planId: string, featureId: string): Promise<void> {
    const relation = await this.planFeatureRepo.findOne({
      where: { plan_id: planId, feature_id: featureId },
    });
    if (!relation) throw new NotFoundException('Plan feature relation not found');

    await this.planFeatureRepo.remove(relation);
  }

  async createFeature(dto: CreateFeatureDto): Promise<FeatureEntity> {
    const feature = this.featureRepo.create(dto);
    return this.featureRepo.save(feature);
  }

  async createPrice(planId: string, dto: CreatePriceDto): Promise<PriceEntity> {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const price = this.priceRepo.create({
      plan_id: plan.id,
      ...dto,
      is_active: true,
    });
    return this.priceRepo.save(price);
  }

  async updatePrice(id: string, dto: UpdatePriceDto): Promise<PriceEntity> {
    const price = await this.priceRepo.findOne({ where: { id } });
    if (!price) throw new NotFoundException('Price not found');

    Object.assign(price, dto);
    return this.priceRepo.save(price);
  }

  async runSeeder(): Promise<{ ok: boolean }> {
    await this.billingSeeder.run();
    return { ok: true };
  }

  async updateFeature(id: string, dto: UpdateFeatureDto): Promise<FeatureEntity> {
    const feature = await this.featureRepo.findOne({ where: { id } });
    if (!feature) throw new NotFoundException('Feature not found');
    Object.assign(feature, dto);
    return this.featureRepo.save(feature);
  }

  async updatePlanFeature(
    planId: string,
    featureId: string,
    dto: UpdatePlanFeatureDto,
  ): Promise<PlanFeatureEntity> {
    const relation = await this.planFeatureRepo.findOne({
      where: { plan_id: planId, feature_id: featureId },
    });
    if (!relation) throw new NotFoundException('Plan-feature relation not found');
    Object.assign(relation, dto);
    return this.planFeatureRepo.save(relation);
  }

  async deletePrice(id: string): Promise<void> {
    const price = await this.priceRepo.findOne({ where: { id } });
    if (!price) throw new NotFoundException('Price not found');
    await this.priceRepo.remove(price);
  }
}
