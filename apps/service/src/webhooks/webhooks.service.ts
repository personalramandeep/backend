import { EPaymentProvider } from '@app/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { INormalizedWebhookEvent } from '../payments/providers/payment-provider.interface';
import { PaymentProviderRegistry } from '../payments/providers/payment-provider.registry';
import { WebhookEventRepository } from './repositories/webhook-event.repository';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly registry: PaymentProviderRegistry,
    private readonly webhookEventRepo: WebhookEventRepository,
    @InjectQueue('billing') private readonly billingQueue: Queue,
  ) {}

  async ingest(provider: EPaymentProvider, rawBody: Buffer, signature: string): Promise<void> {
    const providerImpl = this.registry.resolve(provider);
    const isValid = providerImpl.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn(`Invalid webhook signature from provider: ${provider}`);
      throw new Error('INVALID_SIGNATURE');
    }

    const rawPayload = JSON.parse(rawBody.toString()) as Record<string, unknown>;
    const normalized: INormalizedWebhookEvent = providerImpl.normalizeWebhookEvent(rawPayload);

    this.logger.log(`Webhook received: ${normalized.eventType} (${normalized.providerEventId})`);

    const { doc, created } = await this.webhookEventRepo.upsert({
      provider,
      providerEventId: normalized.providerEventId,
      eventType: normalized.eventType,
      rawPayload,
    });

    if (!created) {
      this.logger.log(`Duplicate webhook event skipped: ${normalized.providerEventId}`);
      await this.webhookEventRepo.markSkipped(doc.id);
      return;
    }

    await this.billingQueue.add(
      `webhook.${normalized.eventType}`,
      {
        webhookDocId: doc.id,
        normalized,
      },
      {
        jobId: normalized.providerEventId,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Webhook event enqueued for processing: ${doc.id}`);
  }
}
