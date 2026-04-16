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

@Entity({ name: 'coach_profiles' })
@Index(['user_id'], { unique: true })
@Index(['is_published'])
export class CoachProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bio: string | null;

  @Column({ type: 'int', nullable: true })
  experience_years: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  specialization: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @Column({ type: 'int', nullable: true })
  hourly_rate: number | null;

  @Column({ default: false })
  is_published: boolean;

  @Column({ default: false })
  verified: boolean;

  @Column({ default: false })
  hide_reviewer_identity: boolean;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
