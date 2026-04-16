import { PlanEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PlanRepository {
  constructor(@InjectRepository(PlanEntity) private readonly repo: Repository<PlanEntity>) {}

  async findAllPublicActive(): Promise<PlanEntity[]> {
    return this.repo.find({
      where: { is_active: true, is_public: true },
      order: { sort_order: 'ASC' },
      relations: ['prices', 'plan_features', 'plan_features.feature'],
    });
  }

  async findBySlug(slug: string): Promise<PlanEntity | null> {
    return this.repo.findOne({
      where: { slug },
      relations: ['prices', 'plan_features', 'plan_features.feature'],
    });
  }

  async findById(id: string): Promise<PlanEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findFreePlan(): Promise<PlanEntity | null> {
    return this.repo.findOne({
      where: { slug: 'free' },
      relations: ['plan_features', 'plan_features.feature'],
    });
  }
}
