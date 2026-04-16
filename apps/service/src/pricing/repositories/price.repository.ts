import { PriceEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PriceRepository {
  constructor(@InjectRepository(PriceEntity) private readonly repo: Repository<PriceEntity>) {}

  async findById(id: string): Promise<PriceEntity | null> {
    return this.repo.findOne({ where: { id, is_active: true } });
  }

  async findByPlan(planId: string): Promise<PriceEntity[]> {
    return this.repo.find({ where: { plan_id: planId, is_active: true } });
  }
}
