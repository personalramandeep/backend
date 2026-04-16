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
import { EAuthProvider } from './auth.types';

@Entity({ name: 'auth_providers' })
@Index(['user_id'])
@Index(['provider', 'provider_user_id'], { unique: true })
export class AuthProviderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => UserEntity, (user) => user.auth_providers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'enum', enum: EAuthProvider })
  provider: EAuthProvider;

  /**
   * - Google → sub
   * - Apple → sub
   * - WhatsApp → phone number
   * - OTP → phone/email
   * - Truecaller → phone or tc id
   * - Local → email or username
   */
  @Column({ type: 'varchar' })
  provider_user_id: string;

  @Column({ type: 'varchar', nullable: true })
  provider_email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone_number: string | null; // E.164; set for OTP/phone-based providers

  @Column({ type: 'varchar', nullable: true })
  password_hash: string | null;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  // Optional metadata (tokens, raw payload, etc.)
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
