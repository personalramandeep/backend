import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserId } from '../auth/decorators/user.decorator';
import { PaymentsService } from '../payments/payments.service';
import { BillingOrchestrator } from './billing.orchestrator';
import { CheckoutDto, VerifyPaymentDto } from './dtos/billing.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('/billing')
export class BillingController {
  constructor(
    private readonly billingOrchestrator: BillingOrchestrator,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post('/checkout')
  @ApiOperation({ summary: 'Create a payment order' })
  async checkout(@UserId() userId: string, @Body() dto: CheckoutDto) {
    return this.billingOrchestrator.initiateCheckout(userId, dto.priceId);
  }

  @Post('/verify-payment')
  @ApiOperation({
    summary: 'Verify payment signature and grant access optimistically.',
  })
  async verifyPayment(@UserId() userId: string, @Body() dto: VerifyPaymentDto) {
    return this.billingOrchestrator.verifyAndGrant({
      userId,
      orderId: dto.orderId,
      providerPaymentId: dto.providerPaymentId,
      providerSignature: dto.providerSignature,
    });
  }

  @Get('/history')
  @ApiOperation({ summary: 'Get payment transaction history for the current user' })
  async getBillingHistory(@UserId() userId: string) {
    const transactions = await this.paymentsService.getBillingHistory(userId);
    return { transactions };
  }
}
