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
import { UserEntity } from '../user/user.entity';

@Entity({ name: 'referrals' })
@Index(['referrer_id'])
@Index(['referred_id'], { unique: true })
export class ReferralEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** who shared the code */
  @Column({ type: 'uuid' })
  referrer_id: string;

  /** new user who signed up */
  @Column({ type: 'uuid' })
  referred_id: string;

  /** true once the bonus quota has been applied to the referrer */
  @Column({ type: 'boolean', default: false })
  reward_granted: boolean;

  /** for future: device fingerprint, IP, utm params, etc. */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrer_id' })
  referrer: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referred_id' })
  referred: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
