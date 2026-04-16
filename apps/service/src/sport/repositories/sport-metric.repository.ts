import { SportMetricEntity } from '@app/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export class SportMetricRepository {
  constructor(@InjectRepository(SportMetricEntity) private readonly repo: Repository<SportMetricEntity>) {}

  create(data: Partial<SportMetricEntity>) {
    return this.repo.create(data);
  }

  save(entity: SportMetricEntity) {
    return this.repo.save(entity);
  }

  removeMany(metrics: SportMetricEntity[]) {
    return this.repo.remove(metrics);
  }
}
