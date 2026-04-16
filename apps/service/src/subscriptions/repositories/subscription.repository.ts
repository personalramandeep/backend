import { ESubscriptionStatus, SubscriptionEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { DeepPartial, LessThan, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class SubscriptionRepository {
  constructor(
    @InjectRepository(SubscriptionEntity) private readonly repo: Repository<SubscriptionEntity>,
  ) {}

  async findActiveByUserId(userId: string): Promise<SubscriptionEntity | null> {
    return this.repo.findOne({
      where: [
        { user_id: userId, status: ESubscriptionStatus.ACTIVE },
        { user_id: userId, status: ESubscriptionStatus.PAST_DUE },
      ],
      relations: ['plan', 'plan.plan_features', 'plan.plan_features.feature', 'price'],
      order: { created_at: 'DESC' },
    });
  }

  async findById(id: string): Promise<SubscriptionEntity | null> {
    return this.repo.findOne({ where: { id }, relations: ['plan', 'price'] });
  }

  async create(data: DeepPartial<SubscriptionEntity>): Promise<SubscriptionEntity> {
    const sub = this.repo.create(data);
    return this.repo.save(sub);
  }

  async update(id: string, data: QueryDeepPartialEntity<SubscriptionEntity>): Promise<void> {
    await this.repo.update(id, data);
  }

  async findExpiredCancelled(): Promise<SubscriptionEntity[]> {
    return this.repo.find({
      where: {
        cancel_at_period_end: true,
        status: ESubscriptionStatus.ACTIVE,
        current_period_end: LessThan(new Date()),
      },
    });
  }

  async updateExpiredCancelledBulk(): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(SubscriptionEntity)
      .set({
        status: ESubscriptionStatus.CANCELLED,
        ended_at: () => 'NOW()',
      })
      .where('cancel_at_period_end = :cancelAtPeriodEnd', { cancelAtPeriodEnd: true })
      .andWhere('status = :status', { status: ESubscriptionStatus.ACTIVE })
      .andWhere('current_period_end < :now', { now: DateTime.utc().toJSDate() })
      .execute();

    return result.affected ?? 0;
  }
}
