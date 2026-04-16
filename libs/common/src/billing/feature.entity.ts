import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EFeatureValueType } from './enums';
import { PlanFeatureEntity } from './plan-feature.entity';

@Entity({ name: 'features' })
export class FeatureEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Machine-readable identifier. Must match a value in FEATURE_KEYS constant.
   * Used in entitlement checks and quota_usage table.
   */
  @Column({ type: 'varchar', length: 80, unique: true })
  key: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  tooltip: string | null;

  /**
   * - boolean: feature is on/off (limit_value on PlanFeature is NULL)
   * - integer: quota-limited (limit_value = -1 for unlimited, N for N per period)
   */
  @Column({ type: 'varchar', length: 20, default: EFeatureValueType.BOOLEAN })
  value_type: EFeatureValueType;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @OneToMany(() => PlanFeatureEntity, (pf) => pf.feature)
  plan_features: PlanFeatureEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
