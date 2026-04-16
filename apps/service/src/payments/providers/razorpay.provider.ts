import { EInternalEventType, EPaymentProvider } from '@app/common';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { ConfigService } from '../../config/config.service';
import { RazorpayWebhookPayload } from '../payments.types';
import {
  ICreateOrderParams,
  ICreateOrderResult,
  INormalizedWebhookEvent,
  IPaymentProvider,
  IVerifyPaymentParams,
} from './payment-provider.interface';

@Injectable()
export class RazorpayProvider implements IPaymentProvider {
  readonly providerName = EPaymentProvider.RAZORPAY;

  private readonly client: Razorpay;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly logger = new Logger(RazorpayProvider.name);

  /** Maps Razorpay event strings to our internal canonical event types. */
  private readonly eventTypeMap: Record<string, EInternalEventType> = {
    'payment.captured': EInternalEventType.PAYMENT_CAPTURED,
    'payment.failed': EInternalEventType.PAYMENT_FAILED,
    // recurring events:
    // 'subscription.charged': EInternalEventType.PAYMENT_CAPTURED,
    // 'subscription.cancelled': EInternalEventType.SUBSCRIPTION_CANCELLED,
  };

  constructor(private readonly configService: ConfigService) {
    const keyId = this.configService.get('RAZORPAY_KEY_ID');
    this.keySecret = this.configService.get('RAZORPAY_KEY_SECRET');
    this.webhookSecret = this.configService.get('RAZORPAY_WEBHOOK_SECRET');

    this.client = new Razorpay({ key_id: keyId, key_secret: this.keySecret });
  }

  async createOrder(params: ICreateOrderParams): Promise<ICreateOrderResult> {
    try {
      const order = await this.client.orders.create({
        amount: params.amountMinorUnits,
        currency: params.currency,
        receipt: params.idempotencyKey.substring(0, 40),
        notes: params.notes,
      });
      return { providerOrderId: order.id };
    } catch (error) {
      this.logger.error('Razorpay order creation failed', error);
      throw new InternalServerErrorException('Failed to create payment order with provider');
    }
  }

  /** Razorpay signs: HMAC-SHA256(orderId + "|" + paymentId, key_secret) */
  verifyPaymentSignature(params: IVerifyPaymentParams): boolean {
    const body = `${params.providerOrderId}|${params.providerPaymentId}`;
    const expected = crypto.createHmac('sha256', this.keySecret).update(body).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.providerSignature));
  }

  /** Razorpay signs: HMAC-SHA256(rawBody, webhook_secret) */
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const expected = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /** Translate a raw Razorpay webhook payload into our normalized format. */
  normalizeWebhookEvent(rawPayload: unknown): INormalizedWebhookEvent {
    const payload = rawPayload as RazorpayWebhookPayload;
    const eventType = this.eventTypeMap[payload.event] ?? EInternalEventType.UNKNOWN;
    const entity = payload.payload?.payment?.entity;

    return {
      // Razorpay has no event.id
      providerEventId: `${payload.event}_${payload.created_at}`, // TODO: verify
      eventType,
      providerPaymentId: entity?.id,
      providerOrderId: entity?.order_id,
      amountMinorUnits: entity?.amount,
      currency: entity?.currency,
      failureReason: entity?.error_description,
    };
  }
}
