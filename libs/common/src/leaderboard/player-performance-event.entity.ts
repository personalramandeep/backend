import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SportEntity } from '../sport/sport.entity';
import { UserEntity } from '../user/user.entity';

export enum EPerformanceEventStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  REJECTED = 'rejected',
  DUPLICATE = 'duplicate',
}

@Entity({ name: 'player_performance_events' })
@Index(['source_event_id'], { unique: true })
@Index(['status'])
@Index(['user_id', 'sport_id'])
@Index(['user_id', 'status', 'created_at'])
export class PlayerPerformanceEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  sport_id: string;

  @Column({ type: 'varchar', length: 150 })
  source_event_id: string;

  @Column({ type: 'float' })
  score: number;

  /** Per-skill raw scores: { footwork: 92, defense: 72, ... } */
  @Column({ type: 'jsonb', nullable: true })
  skill_scores: Record<string, number> | null;

  @Column({
    type: 'enum',
    enum: EPerformanceEventStatus,
    default: EPerformanceEventStatus.PENDING,
  })
  status: EPerformanceEventStatus;

  @Column({ type: 'timestamptz', nullable: true })
  applied_at: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => SportEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sport_id' })
  sport: SportEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
