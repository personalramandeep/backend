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
import { UserEntity } from '../user';

@Entity({ name: 'player_profiles' })
@Index(['user_id'], { unique: true })
export class PlayerProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'float', default: 0 })
  overall_score: number;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'smallint', nullable: true })
  height_cm: number | null;

  @Column({ type: 'smallint', nullable: true })
  weight_kg: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  handedness: 'right' | 'left' | null;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
