import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { UserEntity } from '../user/user.entity';
import { EPaymentProvider, ESubscriptionStatus } from './enums';
import { PlanEntity } from './plan.entity';
import { PriceEntity } from './price.entity';

/**
 * IMPORTANT: plan_id and price_id are immutable once set.
 * To upgrade a user, expire the current subscription and create a new one.
 * This preserves history and keeps grandfathered pricing intact.
 */
@Entity({ name: 'subscriptions' })
@Index(['user_id'])
@Index(['status'])
@Index(['current_period_end'])
@Index(['user_id', 'status'])
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  plan_id: string;

  @Column({ type: 'uuid' })
  price_id: string;

  @Column({ type: 'enum', enum: ESubscriptionStatus, default: ESubscriptionStatus.ACTIVE })
  status: ESubscriptionStatus;

  /** when the subscription first became active. */
  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  started_at: Date;

  /** Start of the current billing period. Quota usage is counted from this date. */
  @Column({ type: 'timestamptz' })
  current_period_start: Date;

  /**
   * End of the current billing period. Access is valid until this date.
   * For one-time purchases: set to 30 days after started_at.
   * For recurring: updated by the renewal webhook handler.
   */
  @Column({ type: 'timestamptz' })
  current_period_end: Date;

  /**
   * true - the subscription will be cancelled at the end of the current period.
   */
  @Column({ type: 'boolean', default: false })
  cancel_at_period_end: boolean;

  /** Timestamp when the user requested cancellation. NULL if not cancelled. */
  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at: Date | null;

  /**
   * Timestamp when access actually ended (period expired or immediate cancellation).
   * Set by the daily expiry cron job.
   */
  @Column({ type: 'timestamptz', nullable: true })
  ended_at: Date | null;

  /** NULL for free plan (no payment involved) */
  @Column({ type: 'enum', enum: EPaymentProvider, nullable: true })
  provider: EPaymentProvider | null;

  /** Provider's own subscription reference ID */
  @Column({ type: 'varchar', length: 150, nullable: true })
  provider_sub_id: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => PlanEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanEntity;

  @ManyToOne(() => PriceEntity, (price) => price.subscriptions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'price_id' })
  price: PriceEntity;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
