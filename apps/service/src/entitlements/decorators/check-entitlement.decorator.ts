import { SetMetadata } from '@nestjs/common';

export const ENTITLEMENT_KEY = 'entitlement_feature_key';

/**
 * @CheckEntitlement(featureKey) — route-level entitlement guard.
 *
 * Usage:
 * ```ts
 * @CheckEntitlement(FEATURE_KEYS.HEATMAPS)
 * @Get('/analysis/:id/heatmap')
 * async getHeatmap(...) { ... }
 * ```
 */
export const CheckEntitlement = (featureKey: string) => SetMetadata(ENTITLEMENT_KEY, featureKey);
