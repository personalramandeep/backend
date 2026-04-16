import { CoachReviewRequestEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';

@Injectable()
export class CoachReviewRepository {
  constructor(
    @InjectRepository(CoachReviewRequestEntity)
    private readonly repository: Repository<CoachReviewRequestEntity>,
  ) {}

  findOne(
    options: FindOneOptions<CoachReviewRequestEntity>,
  ): Promise<CoachReviewRequestEntity | null> {
    return this.repository.findOne(options);
  }

  find(options: FindManyOptions<CoachReviewRequestEntity>): Promise<CoachReviewRequestEntity[]> {
    return this.repository.find(options);
  }

  save(entity: Partial<CoachReviewRequestEntity>): Promise<CoachReviewRequestEntity> {
    return this.repository.save(entity);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
