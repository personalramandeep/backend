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
import { CoachReviewRequestEntity } from './coach-review-request.entity';
import { DrillDto } from './coach-review-request.types';

@Entity({ name: 'coach_feedback_items' })
@Index(['review_request_id'])
export class CoachFeedbackItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  review_request_id: string;

  @Column({ type: 'float', nullable: true })
  video_timestamp_seconds: number | null;

  @Column({ type: 'text' })
  comment: string;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  annotation_url: string | null;

  @Column({ type: 'jsonb', default: [] })
  drills: DrillDto[];

  @ManyToOne(() => CoachReviewRequestEntity, (r: CoachReviewRequestEntity) => r.feedbackItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'review_request_id' })
  reviewRequest: CoachReviewRequestEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
