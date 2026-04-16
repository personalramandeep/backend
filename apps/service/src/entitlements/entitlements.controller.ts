import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserId } from '../auth/decorators/user.decorator';
import { EntitlementService } from './entitlement.service';

@ApiTags('Entitlements')
@ApiBearerAuth()
@Controller('/entitlements')
export class EntitlementsController {
  constructor(private readonly entitlementService: EntitlementService) {}

  @Get('/me')
  @ApiOperation({
    summary: 'Get current user plan capabilities — for frontend feature gating',
  })
  async getMyCapabilities(@UserId() userId: string) {
    const capabilities = await this.entitlementService.getMyCapabilities(userId);
    return { capabilities };
  }
}
