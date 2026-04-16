export interface EntitlementResult {
  allowed: boolean;
  reason?: 'NOT_IN_PLAN' | 'QUOTA_EXCEEDED' | 'PLAN_INACTIVE';
  used?: number;
  limit?: number;
  resetAt?: Date;
  periodStart?: Date;
  periodEnd?: Date;
}
