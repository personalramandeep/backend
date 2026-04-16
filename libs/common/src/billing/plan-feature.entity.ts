import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EQuotaResetPeriod } from './enums';
import { FeatureEntity } from './feature.entity';
import { PlanEntity } from './plan.entity';

/**
 * For each plan, this defines which features are enabled and what their limits are.
 *
 * Examples:
 *   Free plan + video_analyses_per_month → limit_value = 5
 *   Athlete plan + video_analyses_per_month → limit_value = -1 (unlimited)
 *   Free plan + heatmaps → is_enabled = false
 *   Athlete plan + heatmaps → is_enabled = true, limit_value = NULL (boolean)
 */
@Entity({ name: 'plan_features' })
@Index(['plan_id'])
@Index(['feature_id'])
export class PlanFeatureEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  plan_id: string;

  @Column({ type: 'uuid' })
  feature_id: string;

  /**
   * Whether this feature is enabled for this plan.
   * false - disable a feature without deleting the row.
   */
  @Column({ type: 'boolean', default: true })
  is_enabled: boolean;

  /**
   * Quota limit for integer-type features.
   * NULL → feature is boolean (on/off), no limit tracking needed.
   * -1   → unlimited (no quota check performed).
   * N    → user gets N uses per billing period; tracked in quota_usage table.
   */
  @Column({ type: 'int', nullable: true })
  limit_value: number | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  display_label: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  tooltip: string | null;

  @Column({ type: 'enum', enum: EQuotaResetPeriod, nullable: true })
  quota_reset_period: EQuotaResetPeriod | null;

  @ManyToOne(() => PlanEntity, (plan) => plan.plan_features, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanEntity;

  @ManyToOne(() => FeatureEntity, (feature) => feature.plan_features, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'feature_id' })
  feature: FeatureEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
