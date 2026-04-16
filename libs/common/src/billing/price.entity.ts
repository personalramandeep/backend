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
import { EBillingInterval } from './enums';
import { PlanEntity } from './plan.entity';
import { SubscriptionEntity } from './subscription.entity';

/**
 * A specific billing variant for a plan (monthly, yearly, or one-time).
 *
 * One plan has one price per billing interval. To change pricing:
 *   1. Set old price is_active = false
 *   2. Create a new Price with the updated amount
 * This ensures existing subscribers (whose Subscription.price_id points to the old Price)
 * are grandfathered and continue at their original rate.
 */
@Entity({ name: 'prices' })
@Index(['plan_id'])
@Index(['plan_id', 'is_active'])
export class PriceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  plan_id: string;

  @Column({ type: 'enum', enum: EBillingInterval })
  billing_interval: EBillingInterval;

  /** smallest unit of the given currency */
  @Column({ type: 'int' })
  amount_minor_units: number;

  /** ISO 4217 currency code (e.g. 'INR', 'USD', 'EUR') */
  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  /**
   * false - this price is retired. New checkouts cannot use it.
   * Existing subscriptions referencing this price_id continue unaffected.
   */
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  /**
   * recurring plan ID by provider
   * NULL for one-time payments.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  provider_plan_id: string | null;

  /**
   * Optional date from which this price becomes available.
   * NULL = available immediately.
   */
  @Column({ type: 'timestamptz', nullable: true })
  valid_from: Date | null;

  /**
   * Optional date after which no new purchases are accepted.
   * NULL = no expiry. Used to deprecate old price variants gracefully.
   */
  @Column({ type: 'timestamptz', nullable: true })
  valid_until: Date | null;

  @ManyToOne(() => PlanEntity, (plan) => plan.prices, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanEntity;

  @OneToMany(() => SubscriptionEntity, (sub) => sub.price)
  subscriptions: SubscriptionEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
