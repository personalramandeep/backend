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
import { UserEntity } from '../user';
import { CoachFeedbackItemEntity } from './coach-feedback-item.entity';
import { EReviewRequestStatus } from './coach-review-request.types';

@Entity({ name: 'coach_review_requests' })
@Index(['player_user_id', 'coach_user_id', 'post_id'], { unique: true })
@Index(['coach_user_id', 'status'])
@Index(['player_user_id'])
export class CoachReviewRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  player_user_id: string;

  @Column({ type: 'uuid' })
  coach_user_id: string;

  @Column({ type: 'text' })
  post_id: string;

  @Column({ type: 'text', nullable: true })
  player_message: string | null;

  @Column({ type: 'enum', enum: EReviewRequestStatus, default: EReviewRequestStatus.PENDING })
  status: EReviewRequestStatus;

  @Column({ type: 'timestamptz', nullable: true })
  submitted_at: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_user_id' })
  player: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coach_user_id' })
  coach: UserEntity;

  @OneToMany(() => CoachFeedbackItemEntity, (f: CoachFeedbackItemEntity) => f.reviewRequest, {
    cascade: true,
  })
  feedbackItems: CoachFeedbackItemEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
