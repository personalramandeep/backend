import { EInternalEventType } from '@app/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { INormalizedWebhookEvent } from '../payments/providers/payment-provider.interface';
import { BillingOrchestrator } from '../billing/billing.orchestrator';
import { WebhookEventRepository } from './repositories/webhook-event.repository';

interface WebhookEventPayload {
  webhookDocId: string;
  normalized: INormalizedWebhookEvent;
}

@Injectable()
@Processor('billing')
export class WebhookWorkerService extends WorkerHost {
  private readonly logger = new Logger(WebhookWorkerService.name);

  constructor(
    private readonly webhookEventRepo: WebhookEventRepository,
    private readonly billingOrchestrator: BillingOrchestrator,
  ) {
    super();
  }

  async process(job: Job<WebhookEventPayload>): Promise<any> {
    const { webhookDocId, normalized } = job.data;

    try {
      if (job.name === `webhook.${EInternalEventType.PAYMENT_CAPTURED}`) {
        await this.billingOrchestrator.processCapturedPayment(normalized);
      } else if (job.name === `webhook.${EInternalEventType.PAYMENT_FAILED}`) {
        await this.billingOrchestrator.processFailedPayment(normalized);
      } else {
        this.logger.warn(`Unknown job name: ${job.name}`);
      }

      await this.webhookEventRepo.markProcessed(webhookDocId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      await this.webhookEventRepo.markFailed(webhookDocId, msg);
      throw err;
    }
  }
}
