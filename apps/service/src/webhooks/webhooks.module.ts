import { WebhookEventEntity } from '@app/common';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingModule } from '../billing/billing.module';
import { PaymentsModule } from '../payments/payments.module';
import { WebhookEventRepository } from './repositories/webhook-event.repository';
import { WebhookWorkerService } from './webhook-worker.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEventEntity]),
    BullModule.registerQueue({ name: 'billing' }),
    PaymentsModule,
    BillingModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookEventRepository, WebhookWorkerService],
})
export class WebhooksModule {}
