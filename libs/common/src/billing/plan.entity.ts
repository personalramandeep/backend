import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlanFeatureEntity } from './plan-feature.entity';
import { PriceEntity } from './price.entity';
import { ProductEntity } from './product.entity';

/**
 * A pricing tier within a product.
 * Plans should NEVER be deleted — only archived (is_active = false).
 * Existing subscriptions reference plan_id and must remain valid indefinitely.
 */
@Entity({ name: 'plans' })
@Index(['product_id'])
@Index(['is_public', 'sort_order'])
export class PlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string; // Human-readable

  @Column({ type: 'varchar', length: 60, unique: true })
  slug: string; // URL-safe

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * When false, no new subscriptions can be created.
   * Existing subscribers on this plan are NOT affected.
   */
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  /**
   * When false, the plan is hidden from the public pricing page.
   * Useful for internal/legacy plans still serving existing subscribers.
   */
  @Column({ type: 'boolean', default: true })
  is_public: boolean;

  /** display order on the pricing page */
  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  badge_label: string | null; // e.g. "Most Popular", "Best Value"

  /**
   * Number of free trial days before billing begins.
   * 0 = no trial.
   */
  @Column({ type: 'int', default: 0 })
  trial_days: number;

  /** Examples: { "highlight_color": "#FF6B35", "icon": "trophy" } */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @ManyToOne(() => ProductEntity, (product) => product.plans, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  @OneToMany(() => PriceEntity, (price) => price.plan)
  prices: PriceEntity[];

  @OneToMany(() => PlanFeatureEntity, (pf) => pf.plan)
  plan_features: PlanFeatureEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
