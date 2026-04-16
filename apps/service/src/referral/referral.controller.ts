import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { UserId } from '../auth/decorators/user.decorator';
import { ReferralService } from './referral.service';

@ApiTags('Referral')
@Controller('/referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user referral stats and code' })
  async getMyReferralStats(@UserId() userId: string) {
    return this.referralService.getReferralStats(userId);
  }

  @Public()
  @Get('/validate/:code')
  @ApiOperation({ summary: 'Validate a referral code and get referrer name' })
  async validateReferralCode(@Param('code') code: string) {
    return this.referralService.validateCode(code);
  }
}
