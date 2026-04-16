import { PlanFeatureEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PlanFeatureRepository {
  constructor(
    @InjectRepository(PlanFeatureEntity) private readonly repo: Repository<PlanFeatureEntity>,
  ) {}

  async findByPlan(planId: string): Promise<PlanFeatureEntity[]> {
    return this.repo.find({
      where: { plan_id: planId },
      relations: ['feature'],
    });
  }

  async findByPlanAndKey(planId: string, featureKey: string): Promise<PlanFeatureEntity | null> {
    return this.repo
      .createQueryBuilder('pf')
      .innerJoinAndSelect('pf.feature', 'f')
      .where('pf.plan_id = :planId', { planId })
      .andWhere('f.key = :featureKey', { featureKey })
      .getOne();
  }
}
