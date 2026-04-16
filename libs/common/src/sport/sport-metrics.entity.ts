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
import { SportEntity } from './sport.entity';

@Entity({ name: 'sport_metrics' })
@Index(['sport_id'])
@Index(['sport_id', 'key'], { unique: true })
export class SportMetricEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sport_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'float', default: 1 })
  weight: number;

  @ManyToOne(() => SportEntity, (sport) => sport.metrics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sport_id' })
  sport: SportEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
