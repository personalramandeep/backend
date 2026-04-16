import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../user/user.entity';
import { FavoriteTargetType } from './favorite-target-type.enum';

@Entity({ name: 'user_favorites' })
@Index(['user_id', 'target_type', 'target_id'], { unique: true })
@Index(['user_id', 'target_type'])
export class UserFavoriteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 30 })
  target_type: FavoriteTargetType;

  @Column({ type: 'text' })
  target_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
