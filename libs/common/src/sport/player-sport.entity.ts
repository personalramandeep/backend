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
import { SportEntity } from './sport.entity';
import { EExperienceLevel, EPlayingStyle } from './sport.types';

@Entity({ name: 'player_sports' })
@Index(['player_user_id'])
@Index(['sport_id'])
@Index(['player_user_id', 'sport_id'], { unique: true })
export class PlayerSportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  player_user_id: string;

  @Column({ type: 'uuid' })
  sport_id: string;

  @Column({ type: 'enum', enum: EExperienceLevel, nullable: true })
  experience_level: EExperienceLevel | null;

  @Column({ type: 'enum', enum: EPlayingStyle, nullable: true })
  playing_style: EPlayingStyle | null;

  @Column({ type: 'text', nullable: true })
  goals: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_user_id' })
  player: UserEntity;

  @ManyToOne(() => SportEntity)
  @JoinColumn({ name: 'sport_id' })
  sport: SportEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
