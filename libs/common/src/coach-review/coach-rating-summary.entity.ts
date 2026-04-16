import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Read-only from the application layer.
 * The DB trigger fn_update_coach_rating_summary() is the sole writer.
 */
@Entity({ name: 'coach_rating_summary' })
export class CoachRatingSummaryEntity {
  @PrimaryColumn({ type: 'uuid' })
  coach_user_id: string;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  avg_rating: number;

  @Column({ type: 'int', default: 0 })
  total_count: number;

  @Column({ type: 'int', default: 0 })
  count_1: number;

  @Column({ type: 'int', default: 0 })
  count_2: number;

  @Column({ type: 'int', default: 0 })
  count_3: number;

  @Column({ type: 'int', default: 0 })
  count_4: number;

  @Column({ type: 'int', default: 0 })
  count_5: number;

  @Column({ type: 'int', default: 0 })
  total_sessions: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
