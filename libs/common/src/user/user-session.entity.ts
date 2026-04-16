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
import { ERole } from '../role';
import { UserEntity } from './user.entity';

@Entity({ name: 'user_sessions' })
@Index(['user_id'])
@Index(['expires_at'])
@Index(['user_id', 'revoked_at'])
@Index(['refresh_token_hash'], { unique: true })
@Index(['previous_refresh_token_hash'], {
  unique: true,
  where: 'previous_refresh_token_hash IS NOT NULL',
})
export class UserSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => UserEntity, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'enum', enum: ERole, nullable: true })
  active_role?: ERole;

  @Column({ type: 'varchar', length: 128 })
  refresh_token_hash: string; // SHA256 hash

  @Column({ type: 'varchar', length: 128, nullable: true })
  previous_refresh_token_hash?: string; // SHA256 hash for grace period

  @Column({ type: 'timestamptz', nullable: true })
  previous_refresh_token_expiry?: Date; // Grace period expiration

  @Column({ type: 'timestamptz' })
  expires_at: Date; // Sliding expiration

  @Column({ type: 'timestamptz' })
  absolute_expires_at: Date; // Absolute max lifetime

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at: Date | null; // Set when logout / compromise / reuse detected

  @Column({ type: 'timestamptz', nullable: true })
  last_used_at?: Date; // Updated every successful refresh

  @Column({ type: 'varchar', length: 255, nullable: true })
  device_info?: string;

  @Column({ type: 'text', nullable: true })
  user_agent?: string;

  @Column({ type: 'inet', nullable: true })
  ip_address?: string;

  @Column({ type: 'integer', default: 0 })
  rotation_counter: number; // advanced reuse detection

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
