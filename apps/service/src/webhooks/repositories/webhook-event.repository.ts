import { EWebhookEventStatus, WebhookEventEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Repository } from 'typeorm';

@Injectable()
export class WebhookEventRepository {
  constructor(
    @InjectRepository(WebhookEventEntity) private readonly repo: Repository<WebhookEventEntity>,
  ) {}

  async upsert(data: {
    provider: string;
    providerEventId: string;
    eventType: string;
    rawPayload: Record<string, unknown>;
  }): Promise<{ doc: WebhookEventEntity; created: boolean }> {
    const doc = this.repo.create({
      provider: data.provider,
      provider_event_id: data.providerEventId,
      event_type: data.eventType,
      status: EWebhookEventStatus.PENDING,
      raw_payload: data.rawPayload,
      retry_count: 0,
    });

    try {
      const saved = await this.repo.save(doc);
      return { doc: saved, created: true };
    } catch (error: any) {
      if (error.code === '23505') {
        // unique constraint violation
        const existing = await this.repo.findOne({
          where: { provider: data.provider, provider_event_id: data.providerEventId },
        });
        return { doc: existing!, created: false };
      }
      throw error;
    }
  }

  async markProcessed(id: string): Promise<void> {
    await this.repo.update(id, {
      status: EWebhookEventStatus.PROCESSED,
      processed_at: DateTime.utc().toJSDate(),
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.repo.increment({ id }, 'retry_count', 1);
    await this.repo.update(id, {
      status: EWebhookEventStatus.FAILED,
      error_message: errorMessage,
    });
  }

  async markSkipped(id: string): Promise<void> {
    await this.repo.update(id, { status: EWebhookEventStatus.SKIPPED });
  }
}
