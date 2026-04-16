export enum EBillingInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one_time',
}

export enum EPlanType {
  PLATFORM = 'platform',
  COACH_PACKAGE = 'coach_package',
}

/**
 * Lifecycle status of a user's subscription.
 * - active: has access, payments current
 * - past_due: payment failed, in grace period
 * - cancelled: user cancelled; access continues until period end
 * - expired: access ended
 */
export enum ESubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

/**
 * Status of a payment order.
 * - pending: created, waiting for user to pay
 * - paid: payment captured
 * - failed: payment attempt failed
 * - expired: user never paid within the expiry window
 */
export enum EPaymentOrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

/**
 * 'captured': money received, subscription should be/is active.
 * 'failed': payment declined or error, subscription not activated.
 * 'refunded': captured payment has been fully refunded.
 */
export enum EPaymentTransactionStatus {
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum EPaymentProvider {
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
  CASHFREE = 'cashfree',
}

export enum EInternalEventType {
  PAYMENT_CAPTURED = 'payment.captured',
  PAYMENT_FAILED = 'payment.failed',
  UNKNOWN = 'unknown',
}

export enum EFeatureValueType {
  /** Feature is either enabled or disabled. limit_value is NULL. */
  BOOLEAN = 'boolean',
  /**
   * Feature has a numeric limit per billing period.
   * limit_value = -1 means unlimited; limit_value = N means N uses per period.
   */
  INTEGER = 'integer',
}

export enum EQuotaResetPeriod {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  PER_SUBSCRIPTION = 'per_subscription',
}

export enum EWebhookEventStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum EUpgradeStrategy {
  CHAINING = 'chaining',
  OVERRIDE = 'override',
  BLOCK = 'block',
}
