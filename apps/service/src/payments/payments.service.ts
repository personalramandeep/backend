import {
  EPaymentOrderStatus,
  EPaymentProvider,
  EPaymentTransactionStatus,
  PaymentOrderEntity,
  PaymentTransactionEntity,
  PriceEntity,
} from '@app/common';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import crypto from 'crypto';
import { DateTime } from 'luxon';
import { ConfigService } from '../config/config.service';
import { IVerifyPaymentParams } from './providers/payment-provider.interface';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';
import { PaymentOrderRepository } from './repositories/payment-order.repository';
import { PaymentTransactionRepository } from './repositories/payment-transaction.repository';
import { EntityManager } from 'typeorm';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly provider = EPaymentProvider.RAZORPAY;

  constructor(
    private readonly configService: ConfigService,
    private readonly registry: PaymentProviderRegistry,
    private readonly orderRepo: PaymentOrderRepository,
    private readonly txnRepo: PaymentTransactionRepository,
  ) {}

  async createOrder(userId: string, price: PriceEntity): Promise<PaymentOrderEntity> {
    // Idempotency: hash(userId + priceId + 5-minute bucket)
    const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${userId}:${price.id}:${bucket}`)
      .digest('hex');

    const existing = await this.orderRepo.findByIdempotencyKey(idempotencyKey);
    if (existing && existing.status === EPaymentOrderStatus.PENDING) {
      return existing;
    }

    const provider = this.registry.resolve(this.provider);
    const expiresAt = DateTime.utc().plus({ minutes: 30 }).toJSDate();

    const { providerOrderId } = await provider.createOrder({
      idempotencyKey: idempotencyKey.substring(0, 40),
      amountMinorUnits: price.amount_minor_units,
      currency: price.currency,
      notes: { userId, priceId: price.id },
    });

    return this.orderRepo.create({
      user_id: userId,
      price_id: price.id,
      idempotency_key: idempotencyKey,
      status: EPaymentOrderStatus.PENDING,
      amount_minor_units: price.amount_minor_units,
      currency: price.currency,
      provider: this.provider,
      provider_order_id: providerOrderId,
      expires_at: expiresAt,
    });
  }

  verifyPaymentSignature(params: IVerifyPaymentParams & { provider: EPaymentProvider }): void {
    const provider = this.registry.resolve(params.provider);
    const isValid = provider.verifyPaymentSignature(params);
    if (!isValid) {
      throw new UnauthorizedException({
        message: 'Invalid payment signature',
        error_code: 'INVALID_PAYMENT_SIGNATURE',
      });
    }
  }

  async findOrderById(id: string): Promise<PaymentOrderEntity | null> {
    return this.orderRepo.findById(id);
  }

  async findOrderByProviderOrderId(providerOrderId: string): Promise<PaymentOrderEntity | null> {
    return this.orderRepo.findByProviderOrderId(providerOrderId);
  }

  async markOrderPaid(orderId: string, providerPaymentId: string): Promise<void> {
    await this.orderRepo.update(orderId, {
      status: EPaymentOrderStatus.PAID,
    });
  }

  async createTransaction(data: {
    paymentOrderId: string;
    subscriptionId?: string;
    provider: EPaymentProvider;
    providerPaymentId: string;
    providerOrderId?: string;
    amountMinorUnits: number;
    currency: string;
    status: EPaymentTransactionStatus.CAPTURED | EPaymentTransactionStatus.FAILED;
    failureCode?: string;
    failureDescription?: string;
    capturedAt?: Date;
    entityManager?: EntityManager;
  }) {
    const payload = {
      payment_order_id: data.paymentOrderId,
      subscription_id: data.subscriptionId ?? null,
      provider: data.provider,
      provider_payment_id: data.providerPaymentId,
      provider_order_id: data.providerOrderId ?? null,
      amount_minor_units: data.amountMinorUnits,
      currency: data.currency,
      status: data.status,
      failure_code: data.failureCode ?? null,
      failure_description: data.failureDescription ?? null,
      captured_at: data.capturedAt ?? null,
    };

    if (data.entityManager) {
      const entity = data.entityManager.create(PaymentTransactionEntity, payload);
      return data.entityManager.save(PaymentTransactionEntity, entity);
    }
    return this.txnRepo.create(payload);
  }

  async getTransactionByProviderPaymentId(provider: EPaymentProvider, providerPaymentId: string) {
    return this.txnRepo.findByProviderPaymentId(provider, providerPaymentId);
  }

  async getBillingHistory(userId: string) {
    return this.txnRepo.findByUserId(userId);
  }

  async expireStaleOrders(): Promise<number> {
    return this.orderRepo.expireStale(DateTime.utc().toJSDate());
  }

  getRazorpayPublicKey(): string {
    return this.configService.get('RAZORPAY_KEY_ID');
  }
}
