import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SportMetricEntity } from './sport-metrics.entity';
import { SportPostOptions } from './sport.types';

@Entity({ name: 'sports' })
export class SportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  slug: string;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => SportMetricEntity, (metric) => metric.sport)
  metrics: SportMetricEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  post_options?: SportPostOptions;
}
