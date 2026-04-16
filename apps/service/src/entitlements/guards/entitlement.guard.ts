import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ENTITLEMENT_KEY } from '../decorators/check-entitlement.decorator';
import { EntitlementService } from '../entitlement.service';

/**
 * EntitlementGuard — enforces feature access checks on routes decorated with @CheckEntitlement().
 */
@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlementService: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string | undefined>(ENTITLEMENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @CheckEntitlement() on this handler — allow through
    if (!featureKey) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const userId: string | undefined = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const access = await this.entitlementService.canAccess(userId, featureKey, true);

    if (!access.allowed) {
      throw new ForbiddenException({
        error: access.reason,
        featureKey,
        used: access.used,
        limit: access.limit,
        resetAt: access.resetAt?.toISOString() ?? null,
        message:
          access.reason === 'QUOTA_EXCEEDED'
            ? `You've reached your ${featureKey.replace(/_/g, ' ')} limit (${access.used}/${access.limit}). ` +
              `Resets at ${access.resetAt?.toISOString() ?? 'next period'}. Upgrade to continue.`
            : 'This feature is not available on your current plan.',
      });
    }

    return true;
  }
}
