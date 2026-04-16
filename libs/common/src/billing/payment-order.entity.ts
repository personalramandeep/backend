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
  VersionColumn,
} from 'typeorm';
import { UserEntity } from '../user/user.entity';
import { EPaymentOrderStatus, EPaymentProvider } from './enums';
import { PaymentTransactionEntity } from './payment-transaction.entity';
import { PriceEntity } from './price.entity';
import { SubscriptionEntity } from './subscription.entity';

/**
 * An internal payment intent — created before the user pays and updated after
 * One PaymentOrder = one payment attempt for one Price
 * The idempotency_key ensures that if the user retries checkout
 */
@Entity({ name: 'payment_orders' })
@Index(['user_id'])
@Index(['provider_order_id'])
@Index(['status', 'expires_at'])
export class PaymentOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  price_id: string;

  /**
   * The subscription created as a result of this payment (set after activation).
   * NULL until payment is captured and subscription is activated.
   */
  @Column({ type: 'uuid', nullable: true })
  subscription_id: string | null;

  /**
   * Computed as: SHA256(userId + priceId + minute_bucket).
   * DB UNIQUE constraint ensures at-most-once order creation.
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  idempotency_key: string;

  /** Current state of this payment order. */
  @Column({ type: 'enum', enum: EPaymentOrderStatus, default: EPaymentOrderStatus.PENDING })
  status: EPaymentOrderStatus;

  /**
   * Amount in minor units (paise for INR, cents for USD).
   * Verified against webhook event amount.
   */
  @Column({ type: 'int' })
  amount_minor_units: number;

  /** ISO 4217 currency code. Copied from prices.currency at order creation. */
  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @Column({ type: 'enum', enum: EPaymentProvider })
  provider: EPaymentProvider;

  /** NULL until the provider order is created successfully */
  @Column({ type: 'varchar', length: 150, nullable: true })
  provider_order_id: string | null;

  /**
   * When this pending order expires.
   * Stale pending orders are cleaned up by the stale-orders cron job.
   */
  @Column({ type: 'timestamptz', nullable: true })
  expires_at: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => PriceEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'price_id' })
  price: PriceEntity;

  @ManyToOne(() => SubscriptionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription: SubscriptionEntity | null;

  @OneToMany(() => PaymentTransactionEntity, (txn) => txn.payment_order)
  transactions: PaymentTransactionEntity[];

  @VersionColumn()
  version: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
