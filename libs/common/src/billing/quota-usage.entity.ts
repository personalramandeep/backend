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
import { UserEntity } from '../user/user.entity';

/**
 * Per-user, per-feature, per-billing-period usage counter.
 *
 * Reset by recreating rows (logically) when a new billing period starts,
 * because each row is scoped to (user_id, feature_key, period_start).
 */
@Entity({ name: 'quota_usage' })
@Index(['user_id'])
@Index(['user_id', 'feature_key', 'period_start'], { unique: true })
export class QuotaUsageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  /** Only integer-type features are tracked here; boolean features have no quota */
  @Column({ type: 'varchar', length: 80 })
  feature_key: string;

  /**
   * Start of the billing period this usage belongs to.
   * Copied from Subscription.current_period_start at the time of usage.
   */
  @Column({ type: 'timestamptz' })
  period_start: Date;

  /**
   * End of the billing period. Informational — used for display and cleanup.
   * Quota checks use period_start for grouping (not period_end).
   */
  @Column({ type: 'timestamptz' })
  period_end: Date;

  /**
   * Number of times this feature has been used in the current period.
   * Incremented atomically via upsert. Never decremented.
   */
  @Column({ type: 'int', default: 0 })
  used_count: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
