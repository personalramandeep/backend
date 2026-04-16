import { EPaymentOrderStatus, PaymentOrderEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class PaymentOrderRepository {
  constructor(
    @InjectRepository(PaymentOrderEntity) private readonly repo: Repository<PaymentOrderEntity>,
  ) {}

  async findById(id: string): Promise<PaymentOrderEntity | null> {
    return this.repo.findOne({ where: { id }, relations: ['price'] });
  }

  async findByIdempotencyKey(key: string): Promise<PaymentOrderEntity | null> {
    return this.repo.findOne({ where: { idempotency_key: key } });
  }

  async findByProviderOrderId(providerOrderId: string): Promise<PaymentOrderEntity | null> {
    return this.repo.findOne({ where: { provider_order_id: providerOrderId } });
  }

  async create(data: DeepPartial<PaymentOrderEntity>): Promise<PaymentOrderEntity> {
    const order = this.repo.create(data);
    return this.repo.save(order);
  }

  async update(id: string, data: QueryDeepPartialEntity<PaymentOrderEntity>): Promise<void> {
    await this.repo.update(id, data);
  }

  async expireStale(olderThan: Date): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update()
      .set({ status: EPaymentOrderStatus.EXPIRED })
      .where('status = :status', { status: EPaymentOrderStatus.PENDING })
      .andWhere('expires_at < :olderThan', { olderThan })
      .execute();
    return result.affected ?? 0;
  }
}
