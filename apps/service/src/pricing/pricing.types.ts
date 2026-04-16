import { EQuotaResetPeriod } from '@app/common';

export interface PlanCapability {
  enabled: boolean;
  limit: number | null;
  label: string;
  display_label: string | null;
  quota_reset_period: EQuotaResetPeriod | null;
}
