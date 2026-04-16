import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EPlanType } from './enums';
import { PlanEntity } from './plan.entity';

@Entity({ name: 'products' })
@Index(['type', 'is_active'])
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string; // Human-readable

  @Column({ type: 'varchar', length: 60, unique: true })
  slug: string; // URL-safe unique identifier

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: EPlanType, default: EPlanType.PLATFORM })
  type: EPlanType;

  /** When false, no new subscriptions can be created for plans in this product. */
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany(() => PlanEntity, (plan) => plan.product)
  plans: PlanEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
