import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../user/user.entity';

@Entity({ name: 'referral_bonuses' })
@Index(['user_id', 'feature_key'], { unique: true })
export class ReferralBonusEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 80 })
  feature_key: string;

  @Column({ type: 'int', default: 0 })
  bonus_count: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
