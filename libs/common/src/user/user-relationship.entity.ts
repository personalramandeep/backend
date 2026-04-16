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
import { UserEntity } from './user.entity';
import { EUserRelationshipType } from './user.types';

@Entity({ name: 'user_relationships' })
@Index(['source_user_id'])
@Index(['target_user_id'])
@Index(['source_user_id', 'target_user_id', 'relationship_type'], { unique: true })
export class UserRelationshipEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  source_user_id: string;

  @Column({ type: 'uuid' })
  target_user_id: string;

  @Column({ type: 'enum', enum: EUserRelationshipType })
  relationship_type: EUserRelationshipType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_user_id' })
  source_user: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_user_id' })
  target_user: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
