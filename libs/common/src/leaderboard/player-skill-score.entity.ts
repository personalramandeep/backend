import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SportEntity } from '../sport/sport.entity';
import { UserEntity } from '../user/user.entity';

/** per skill dimension (footwork, defense, smash, …) per (user × sport). */
@Entity({ name: 'player_skill_scores' })
@Index(['user_id', 'sport_id'])
@Index(['user_id', 'sport_id', 'metric_key'], { unique: true })
export class PlayerSkillScoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  sport_id: string;

  @Column({ type: 'varchar', length: 100 })
  metric_key: string;

  @Column({ type: 'float', default: 0 })
  avg_score: number;

  @Column({ type: 'int', default: 0 })
  video_count: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => SportEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sport_id' })
  sport: SportEntity;

  @UpdateDateColumn({ type: 'timestamptz' })
  last_updated_at: Date;
}
