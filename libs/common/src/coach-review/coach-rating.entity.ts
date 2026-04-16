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
import { UserEntity } from '../user';
import { CoachReviewRequestEntity } from './coach-review-request.entity';

@Entity({ name: 'coach_ratings' })
@Index(['review_request_id'], { unique: true })
@Index(['coach_user_id', 'created_at'])
@Index(['player_user_id'])
export class CoachRatingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  player_user_id: string;

  @Column({ type: 'uuid' })
  coach_user_id: string;

  @Column({ type: 'uuid' })
  review_request_id: string;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  review_text: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ default: false })
  is_flagged: boolean;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_user_id' })
  player: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coach_user_id' })
  coach: UserEntity;

  @ManyToOne(() => CoachReviewRequestEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_request_id' })
  reviewRequest: CoachReviewRequestEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
