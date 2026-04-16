import { EPaymentProvider, PaymentTransactionEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PaymentTransactionRepository {
  constructor(
    @InjectRepository(PaymentTransactionEntity)
    private readonly repo: Repository<PaymentTransactionEntity>,
  ) {}

  async findByProviderPaymentId(
    provider: EPaymentProvider,
    providerPaymentId: string,
  ): Promise<PaymentTransactionEntity | null> {
    return this.repo.findOne({
      where: { provider: provider, provider_payment_id: providerPaymentId },
    });
  }

  async findByOrderId(paymentOrderId: string): Promise<PaymentTransactionEntity[]> {
    return this.repo.find({ where: { payment_order_id: paymentOrderId } });
  }

  async findByUserId(userId: string): Promise<PaymentTransactionEntity[]> {
    return this.repo
      .createQueryBuilder('txn')
      .innerJoin('txn.payment_order', 'order')
      .where('order.user_id = :userId', { userId })
      .orderBy('txn.created_at', 'DESC')
      .getMany();
  }

  async create(data: Partial<PaymentTransactionEntity>): Promise<PaymentTransactionEntity> {
    const txn = this.repo.create(data);
    return this.repo.save(txn);
  }
}
