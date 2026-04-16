import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../user/user.entity';

// TODO: should i live in user or profile domain?
@Entity({ name: 'geo_profiles' })
@Index(['user_id'], { unique: true })
@Index(['country'])
@Index(['country', 'state'])
export class GeoProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  /** ISO 3166-1 alpha-3 country code. E.g. 'IND', 'USA'. */
  @Column({ type: 'varchar', length: 3, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
