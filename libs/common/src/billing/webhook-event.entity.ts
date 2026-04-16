import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EWebhookEventStatus } from './enums';

@Entity({ name: 'webhook_events' })
@Index(['provider', 'provider_event_id'], { unique: true })
@Index(['status'])
export class WebhookEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 150 })
  provider_event_id: string;

  /** Our internal normalized event type (e.g. 'payment.captured', 'payment.failed') */
  @Column({ type: 'varchar', length: 100 })
  event_type: string;

  /**
   * Processing status of this webhook event.
   * - pending: received, not yet processed
   * - processed: handler completed successfully
   * - failed: handler threw an error
   * - skipped: duplicate event, already processed
   */
  @Column({
    type: 'enum',
    enum: EWebhookEventStatus,
    default: EWebhookEventStatus.PENDING,
  })
  status: EWebhookEventStatus;

  /** for audit and debugging */
  @Column({ type: 'jsonb' })
  raw_payload: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  processed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'int', default: 0 })
  retry_count: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
