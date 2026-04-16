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
import { EPaymentProvider, EPaymentTransactionStatus } from './enums';
import { PaymentOrderEntity } from './payment-order.entity';
import { SubscriptionEntity } from './subscription.entity';

/**
 * A confirmed payment event from a provider (captured or failed).
 *
 * Created in two cases:
 *   1. Optimistic: when verify-payment endpoint receives a valid HMAC signature
 *   2. Authoritative: when the webhook 'payment.captured' event is processed
 */
@Entity({ name: 'payment_transactions' })
@Index(['payment_order_id'])
@Index(['subscription_id'], { where: 'subscription_id IS NOT NULL' })
export class PaymentTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  payment_order_id: string;

  @Column({ type: 'uuid', nullable: true })
  subscription_id: string | null;

  @Column({ type: 'enum', enum: EPaymentProvider })
  provider: EPaymentProvider;

  /** Unique per provider — enforced by DB UNIQUE (provider, provider_payment_id) */
  @Column({ type: 'varchar', length: 150 })
  provider_payment_id: string;

  /**
   * Provider's order reference, if available.
   * Razorpay: the order_id the payment was created for.
   */
  @Column({ type: 'varchar', length: 150, nullable: true })
  provider_order_id: string | null;

  @Column({ type: 'int' })
  amount_minor_units: number;

  /** ISO 4217 currency code */
  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  /**
   * 'captured': money received, subscription should be/is active.
   * 'failed': payment declined or error, subscription not activated.
   * 'refunded': captured payment has been fully refunded.
   */
  @Column({ type: 'varchar', length: 30 })
  status: EPaymentTransactionStatus;

  /** Provider failure code (e.g. 'BAD_REQUEST_ERROR', 'GATEWAY_ERROR'). NULL on success. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  failure_code: string | null;

  /** Human-readable failure reason from provider. NULL on success. */
  @Column({ type: 'text', nullable: true })
  failure_description: string | null;

  /** Timestamp when the payment was captured. NULL if not yet captured or failed. */
  @Column({ type: 'timestamptz', nullable: true })
  captured_at: Date | null;

  @ManyToOne(() => PaymentOrderEntity, (order) => order.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_order_id' })
  payment_order: PaymentOrderEntity;

  @ManyToOne(() => SubscriptionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription: SubscriptionEntity | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
