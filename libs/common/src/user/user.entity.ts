import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuthProviderEntity } from '../auth/auth-provider.entity';
import { PlayerProfileEntity } from '../profile';
import { UserRoleEntity } from '../role';
import { UserSessionEntity } from './user-session.entity';
import { EUserAccountStatus, EUserGender } from './user.types';

@Entity({ name: 'users' })
@Index(['username'], { unique: true })
@Index(['account_status'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  full_name: string;

  @Column({ length: 25, unique: true })
  username: string;

  @Column({ type: 'enum', enum: EUserGender })
  gender: EUserGender;

  @Column({ type: 'text', nullable: true })
  profile_pic_url: string | null;

  @Column({ type: 'date', nullable: true })
  dob: Date | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  bio: string | null;

  @Column({
    type: 'enum',
    enum: EUserAccountStatus,
    default: EUserAccountStatus.ACTIVE,
  })
  account_status: EUserAccountStatus;

  @Column({ type: 'varchar', nullable: true })
  @Index({ unique: true, where: '"email" IS NOT NULL' })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  @Index({ unique: true, where: '"phone_number" IS NOT NULL' })
  phone_number: string | null; // E.164 format e.g. +918888888888

  @Column({ type: 'varchar', length: 64, nullable: true })
  timezone: string | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  last_login_at: Date;

  @Column({ default: 0 })
  token_version: number;

  @OneToMany(() => AuthProviderEntity, (provider) => provider.user, { cascade: true })
  auth_providers: AuthProviderEntity[];

  @OneToMany(() => UserSessionEntity, (session) => session.user)
  sessions: UserSessionEntity[];

  @OneToMany(() => UserRoleEntity, (ur) => ur.user)
  roles: UserRoleEntity[];

  @OneToOne(() => PlayerProfileEntity, (p) => p.user)
  player_profile: PlayerProfileEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
