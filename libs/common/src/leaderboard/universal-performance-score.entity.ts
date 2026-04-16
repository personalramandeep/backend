import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../user/user.entity';

@Entity({ name: 'universal_performance_scores' })
@Index(['avg_score'])
@Index(['user_id'], { unique: true })
export class UniversalPerformanceScoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

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

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
