import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserId } from '../auth/decorators/user.decorator';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('/me')
  @ApiOperation({ summary: 'Get your current subscription status and period dates' })
  async getMySubscription(@UserId() userId: string) {
    const subscription = await this.subscriptionsService.getActiveSubscription(userId);
    return { subscription };
  }

  @Post('/me/cancel')
  @ApiOperation({ summary: 'Cancel subscription at end of current billing period' })
  async cancelSubscription(@UserId() userId: string) {
    const sub = await this.subscriptionsService.cancelAtPeriodEnd(userId);
    return {
      subscription: sub,
      message: 'Subscription will be cancelled at period end. You retain access until then.',
    };
  }
}
