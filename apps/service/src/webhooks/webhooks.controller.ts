import { EPaymentProvider } from '@app/common';
import {
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * app.use('/webhooks', bodyParser.raw({ type: '*\/*' }))
   */
  @Post('/razorpay')
  @Public()
  @ApiExcludeEndpoint()
  async razorpayWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ): Promise<{ received: true }> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new UnauthorizedException('Raw body not available — check rawBody middleware');
    }

    try {
      await this.webhooksService.ingest(EPaymentProvider.RAZORPAY, rawBody, signature ?? '');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'INVALID_SIGNATURE') {
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    // Always return 200 to acknowledge receipt
    return { received: true };
  }
}
