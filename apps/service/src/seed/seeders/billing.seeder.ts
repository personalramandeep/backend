import {
  EBillingInterval,
  EFeatureValueType,
  EPlanType,
  EQuotaResetPeriod,
  FEATURE_KEYS,
  FeatureEntity,
  PlanEntity,
  PlanFeatureEntity,
  PriceEntity,
  ProductEntity,
} from '@app/common';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

interface PlanFeatureSeedRow {
  key: string;
  isEnabled: boolean;
  limitValue: number | null;
  displayLabel?: string | null;
  quotaResetPeriod?: EQuotaResetPeriod | null;
}

@Injectable()
export class BillingSeeder {
  private readonly logger = new Logger(BillingSeeder.name);

  constructor(
    @InjectRepository(ProductEntity) private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(PlanEntity) private readonly planRepo: Repository<PlanEntity>,
    @InjectRepository(PriceEntity) private readonly priceRepo: Repository<PriceEntity>,
    @InjectRepository(FeatureEntity) private readonly featureRepo: Repository<FeatureEntity>,
    @InjectRepository(PlanFeatureEntity)
    private readonly planFeatureRepo: Repository<PlanFeatureEntity>,
  ) {}

  async run(): Promise<void> {
    this.logger.log('Starting billing seed...');

    const product = await this.seedProduct();
    const [freePlan, athletePlan] = await this.seedPlans(product);
    const featureMap = await this.seedFeatures();
    await this.seedPlanFeatures(freePlan, athletePlan, featureMap);
    await this.seedPrices(freePlan, athletePlan);

    this.logger.log('Billing seed completed successfully');
  }

  private async seedProduct(): Promise<ProductEntity> {
    const existing = await this.productRepo.findOne({ where: { slug: 'kreeda-platform' } });
    if (existing) {
      this.logger.verbose('Product already exists — skipping');
      return existing;
    }
    const product = this.productRepo.create({
      slug: 'kreeda-platform',
      name: 'Kreeda Platform',
      description: 'Core Kreeda player plans',
      type: EPlanType.PLATFORM,
      is_active: true,
    });
    return this.productRepo.save(product);
  }

  private async seedPlans(product: ProductEntity): Promise<[PlanEntity, PlanEntity]> {
    const free = await this.upsertPlan({
      product_id: product.id,
      slug: 'free',
      name: 'Player',
      description: 'Start improving today',
      sort_order: 0,
      badge_label: null,
    });

    const athlete = await this.upsertPlan({
      product_id: product.id,
      slug: 'athlete',
      name: 'Kreeda Athlete',
      description: 'Train like you mean it',
      sort_order: 1,
      badge_label: 'Most Popular',
    });

    return [free, athlete];
  }

  private async upsertPlan(data: Partial<PlanEntity> & { slug: string }): Promise<PlanEntity> {
    const existing = await this.planRepo.findOne({ where: { slug: data.slug } });
    if (existing) {
      this.logger.verbose(`Plan '${data.slug}' already exists — skipping`);
      return existing;
    }
    return this.planRepo.save(this.planRepo.create({ ...data, is_active: true, is_public: true }));
  }

  private async seedFeatures(): Promise<Map<string, FeatureEntity>> {
    const definitions = [
      {
        key: FEATURE_KEYS.VIDEO_ANALYSES,
        label: '3 match analyses/month',
        value_type: EFeatureValueType.INTEGER,
      },
      {
        key: FEATURE_KEYS.AI_COACH,
        label: 'AI Coach',
        value_type: EFeatureValueType.INTEGER,
      },
      // {
      //   key: FEATURE_KEYS.ADVANCED_METRICS,
      //   label: 'Advanced AI Metrics',
      //   value_type: EFeatureValueType.BOOLEAN,
      // },
      // {
      //   key: FEATURE_KEYS.HEATMAPS,
      //   label: 'Heatmap Overlays',
      //   value_type: EFeatureValueType.BOOLEAN,
      // },
      // {
      //   key: FEATURE_KEYS.CREATE_CHALLENGE,
      //   label: 'Create Challenges',
      //   value_type: EFeatureValueType.BOOLEAN,
      // },
      // {
      //   key: FEATURE_KEYS.COACH_MESSAGING,
      //   label: 'Coach Messaging',
      //   value_type: EFeatureValueType.BOOLEAN,
      // },
      // {
      //   key: FEATURE_KEYS.ATHLETE_BADGE,
      //   label: 'Athlete Badge',
      //   value_type: EFeatureValueType.BOOLEAN,
      // },
      // {
      //   key: FEATURE_KEYS.LEADERBOARD_ACCESS,
      //   label: 'Leaderboard Access',
      //   value_type: EFeatureValueType.BOOLEAN,
      // },
      // {
      //   key: FEATURE_KEYS.AI_TRAINING_PLANS,
      //   label: 'AI Training Plans',
      //   value_type: EFeatureValueType.BOOLEAN,
      // },
    ];

    const map = new Map<string, FeatureEntity>();

    for (const def of definitions) {
      let feature = await this.featureRepo.findOne({ where: { key: def.key } });
      if (!feature) {
        feature = await this.featureRepo.save(this.featureRepo.create(def));
        this.logger.verbose(`Feature '${def.key}' created`);
      }
      map.set(def.key, feature);
    }

    return map;
  }

  private async seedPlanFeatures(
    freePlan: PlanEntity,
    athletePlan: PlanEntity,
    featureMap: Map<string, FeatureEntity>,
  ): Promise<void> {
    const freePlanRows: PlanFeatureSeedRow[] = [
      {
        key: FEATURE_KEYS.VIDEO_ANALYSES,
        isEnabled: true,
        limitValue: 3,
        displayLabel: 'Each video up to 45 sec. +1 bonus analysis per referral',
        quotaResetPeriod: null,
      },
      {
        key: FEATURE_KEYS.AI_COACH,
        isEnabled: true,
        limitValue: 4,
        displayLabel: 'Up to 4 insights per day',
        quotaResetPeriod: EQuotaResetPeriod.DAILY,
      },
      // { key: FEATURE_KEYS.ADVANCED_METRICS, isEnabled: false, limitValue: null },
      // { key: FEATURE_KEYS.HEATMAPS, isEnabled: false, limitValue: null },
      // { key: FEATURE_KEYS.CREATE_CHALLENGE, isEnabled: false, limitValue: null },
      // { key: FEATURE_KEYS.COACH_MESSAGING, isEnabled: true, limitValue: null },
      // { key: FEATURE_KEYS.ATHLETE_BADGE, isEnabled: false, limitValue: null },
      // { key: FEATURE_KEYS.LEADERBOARD_ACCESS, isEnabled: true, limitValue: null },
      // { key: FEATURE_KEYS.AI_TRAINING_PLANS, isEnabled: false, limitValue: null },
    ];

    const athletePlanRows: PlanFeatureSeedRow[] = [
      { key: FEATURE_KEYS.VIDEO_ANALYSES, isEnabled: true, limitValue: -1 },
      {
        key: FEATURE_KEYS.AI_COACH,
        isEnabled: true,
        limitValue: -1,
        displayLabel: 'Personal AI Coach',
        quotaResetPeriod: null,
      },
      // { key: FEATURE_KEYS.ADVANCED_METRICS, isEnabled: true, limitValue: null },
      // { key: FEATURE_KEYS.HEATMAPS, isEnabled: true, limitValue: null },
      // { key: FEATURE_KEYS.CREATE_CHALLENGE, isEnabled: true, limitValue: null },
      // { key: FEATURE_KEYS.COACH_MESSAGING, isEnabled: true, limitValue: null },
      // { key: FEATURE_KEYS.ATHLETE_BADGE, isEnabled: true, limitValue: null },
      // { key: FEATURE_KEYS.LEADERBOARD_ACCESS, isEnabled: true, limitValue: null },
      // { key: FEATURE_KEYS.AI_TRAINING_PLANS, isEnabled: true, limitValue: null },
    ];

    await this.upsertPlanFeatures(freePlan, freePlanRows, featureMap);
    await this.upsertPlanFeatures(athletePlan, athletePlanRows, featureMap);
  }

  private async upsertPlanFeatures(
    plan: PlanEntity,
    rows: PlanFeatureSeedRow[],
    featureMap: Map<string, FeatureEntity>,
  ): Promise<void> {
    for (const row of rows) {
      const feature = featureMap.get(row.key)!;
      const existing = await this.planFeatureRepo.findOne({
        where: { plan_id: plan.id, feature_id: feature.id },
      });
      if (!existing) {
        await this.planFeatureRepo.save(
          this.planFeatureRepo.create({
            plan_id: plan.id,
            feature_id: feature.id,
            is_enabled: row.isEnabled,
            limit_value: row.limitValue,
            display_label: row.displayLabel ?? null,
            quota_reset_period: row.quotaResetPeriod ?? null,
          }),
        );
        this.logger.verbose(`PlanFeature '${plan.slug}' + '${row.key}' created`);
      }
    }
  }

  private async seedPrices(freePlan: PlanEntity, athletePlan: PlanEntity): Promise<void> {
    // Free plan has no price — users access it without payment

    // Athlete — one-time ₹299 (29900 paise)
    const athletePrice = await this.priceRepo.findOne({
      where: { plan_id: athletePlan.id, billing_interval: EBillingInterval.MONTHLY },
    });
    if (!athletePrice) {
      await this.priceRepo.save(
        this.priceRepo.create({
          plan_id: athletePlan.id,
          billing_interval: EBillingInterval.MONTHLY,
          amount_minor_units: 299 * 100,
          currency: 'INR',
          is_active: true,
        }),
      );
      this.logger.verbose('Athlete one-time price ₹299 created');
    }

    void freePlan; // Free plan intentionally has no price row
  }
}
