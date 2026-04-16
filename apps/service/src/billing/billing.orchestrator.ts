import {
  EInternalEventType,
  EPaymentOrderStatus,
  EPaymentTransactionStatus,
  PaymentOrderEntity,
  SubscriptionEntity,
} from '@app/common';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { DataSource } from 'typeorm';
import { PaymentsService } from '../payments/payments.service';
import { INormalizedWebhookEvent } from '../payments/providers/payment-provider.interface';
import { PricingService } from '../pricing/pricing.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class BillingOrchestrator {
  private readonly logger = new Logger(BillingOrchestrator.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly paymentsService: PaymentsService,
    private readonly pricingService: PricingService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async initiateCheckout(userId: string, priceId: string) {
    const price = await this.pricingService.getPriceById(priceId);
    const order = await this.paymentsService.createOrder(userId, price);

    return {
      orderId: order.id,
      providerOrderId: order.provider_order_id,
      amountMinorUnits: order.amount_minor_units,
      currency: order.currency,
      providerKey: this.paymentsService.getRazorpayPublicKey(),
    };
  }

  async verifyAndGrant(params: {
    userId: string;
    orderId: string;
    providerPaymentId: string;
    providerSignature: string;
  }) {
    const { userId, orderId, providerPaymentId, providerSignature } = params;

    const order = await this.paymentsService.findOrderById(orderId);
    if (!order) throw new NotFoundException('Payment order not found');
    if (order.user_id !== userId) {
      throw new BadRequestException('Order does not belong to this user');
    }

    this.paymentsService.verifyPaymentSignature({
      provider: order.provider,
      providerOrderId: order.provider_order_id!,
      providerPaymentId: providerPaymentId,
      providerSignature: providerSignature,
    });

    if (order.status === EPaymentOrderStatus.PAID) {
      const sub = order.subscription_id
        ? await this.subscriptionsService.findById(order.subscription_id)
        : null;
      return { status: 'active', subscription: sub };
    }

    // return { status: 'pending', subscription: null }

    try {
      this.logger.log('Bypassing webhook: Running synchronous capture process inline.');
      const sub = await this.processCapturedPayment({
        providerEventId: `sync_capture_${Date.now()}`,
        eventType: EInternalEventType.PAYMENT_CAPTURED,
        providerOrderId: order.provider_order_id!,
        providerPaymentId: providerPaymentId,
        amountMinorUnits: order.amount_minor_units,
        currency: order.currency,
      });

      return { status: 'active', subscription: sub };
    } catch (err) {
      this.logger.error('Failed inline synchronous capture', err);
      return { status: 'failed', subscription: null };
    }
  }

  async processCapturedPayment(
    normalized: INormalizedWebhookEvent,
  ): Promise<SubscriptionEntity | null> {
    this.logger.log(`Processing payment.captured in orchestrator: ${normalized.providerPaymentId}`);

    if (!normalized.providerOrderId) {
      this.logger.warn(`payment.captured missing providerOrderId — skipping`);
      return null;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(PaymentOrderEntity, {
        where: { provider_order_id: normalized.providerOrderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        this.logger.warn(`No PaymentOrder found for provider order: ${normalized.providerOrderId}`);
        await queryRunner.rollbackTransaction();
        return null;
      }

      if (order.status === EPaymentOrderStatus.PAID) {
        if (
          normalized.amountMinorUnits &&
          normalized.amountMinorUnits !== order.amount_minor_units
        ) {
          throw new InternalServerErrorException(
            `AMOUNT MISMATCH on order ${order.id}: expected ${order.amount_minor_units}, provider sent ${normalized.amountMinorUnits}`,
          );
        }
        this.logger.log(`Order ${order.id} already paid — no action needed`);
        await queryRunner.rollbackTransaction();
        return null;
      }

      const existingTxn = await this.paymentsService.getTransactionByProviderPaymentId(
        order.provider,
        normalized.providerPaymentId!,
      );
      if (existingTxn) {
        this.logger.log(
          `Transaction already exists for ${normalized.providerPaymentId} — skipping`,
        );
        await queryRunner.rollbackTransaction();
        return null;
      }

      const price = await this.pricingService.getPriceById(order.price_id);
      const plan = await this.pricingService.getPlanById(price.plan_id);

      const subscription = await this.subscriptionsService.activate({
        userId: order.user_id,
        plan,
        price,
        entityManager: queryRunner.manager,
      });

      await this.paymentsService.createTransaction({
        paymentOrderId: order.id,
        subscriptionId: subscription.id,
        provider: order.provider,
        providerPaymentId: normalized.providerPaymentId!,
        providerOrderId: normalized.providerOrderId,
        amountMinorUnits: normalized.amountMinorUnits ?? order.amount_minor_units,
        currency: normalized.currency ?? order.currency,
        status: EPaymentTransactionStatus.CAPTURED,
        capturedAt: DateTime.utc().toJSDate(),
        entityManager: queryRunner.manager,
      });

      // Update locked order
      order.status = EPaymentOrderStatus.PAID;
      await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();
      this.logger.log(
        `Subscription ${subscription.id} activated via orchestrator for user ${order.user_id}`,
      );

      return subscription;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async processFailedPayment(normalized: INormalizedWebhookEvent): Promise<void> {
    if (!normalized.providerOrderId) return;
    const order = await this.paymentsService.findOrderByProviderOrderId(normalized.providerOrderId);
    if (!order) return;

    await this.paymentsService.createTransaction({
      paymentOrderId: order.id,
      provider: order.provider,
      providerPaymentId: normalized.providerPaymentId ?? `failed_${Date.now()}`,
      providerOrderId: normalized.providerOrderId,
      amountMinorUnits: order.amount_minor_units,
      currency: order.currency,
      status: EPaymentTransactionStatus.FAILED,
      failureDescription: normalized.failureReason,
    });
  }
}
