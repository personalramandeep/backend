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
import { SportEntity } from '../sport/sport.entity';
import { UserEntity } from '../user/user.entity';

@Entity({ name: 'player_performance_scores' })
@Index(['sport_id', 'avg_score'])
@Index(['user_id'])
@Index(['user_id', 'sport_id'], { unique: true })
export class PlayerPerformanceScoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  sport_id: string;

  @Column({ type: 'float', default: 0 })
  avg_score: number;

  @Column({ type: 'float', default: 0 })
  prev_avg_score: number;

  @Column({ type: 'int', default: 0 })
  video_count: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  last_updated_at: Date;

  @Column({ type: 'int', default: 0 })
  version: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => SportEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sport_id' })
  sport: SportEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
