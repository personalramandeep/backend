import { EInternalEventType, EPaymentProvider } from '@app/common';

export interface ICreateOrderParams {
  idempotencyKey: string;
  amountMinorUnits: number;
  currency: string;
  notes?: Record<string, string>;
}

export interface ICreateOrderResult {
  providerOrderId: string;
}

export interface IVerifyPaymentParams {
  providerOrderId: string;
  providerPaymentId: string;
  providerSignature: string;
}

export interface INormalizedWebhookEvent {
  providerEventId: string;
  eventType: EInternalEventType;
  providerPaymentId?: string;
  providerOrderId?: string;
  amountMinorUnits?: number;
  currency?: string;
  failureReason?: string;
}

/**
 * IPaymentProvider — the contract every payment provider must implement.
 */
export interface IPaymentProvider {
  readonly providerName: EPaymentProvider;

  createOrder(params: ICreateOrderParams): Promise<ICreateOrderResult>;

  verifyPaymentSignature(params: IVerifyPaymentParams): boolean;

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;

  normalizeWebhookEvent(rawPayload: unknown): INormalizedWebhookEvent;

  // ── (recurring subscriptions) ──────────────────────────────────────
  // createSubscription(params: ICreateSubscriptionParams): Promise<{ providerSubscriptionId: string }>;
  // cancelSubscription(providerSubscriptionId: string): Promise<void>;
  // processRefund(params: IRefundParams): Promise<{ providerRefundId: string }>;
}
