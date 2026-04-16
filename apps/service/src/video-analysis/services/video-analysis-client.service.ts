import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { DateTime } from 'luxon';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '../../config/config.service';
import { VideoAnalysisRequest } from '../dtos/video-analysis-request.dto';

export interface VideoAnalysisDispatchResult {
  dispatched: boolean;
  error?: string;
}

@Injectable()
export class VideoAnalysisClient {
  private readonly logger = new Logger(VideoAnalysisClient.name);

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async sendForAnalysis(payload: VideoAnalysisRequest): Promise<VideoAnalysisDispatchResult> {
    try {
      const { callbackUrl } = this.configService.videoAnalysisSvcConfig;
      const enrichedPayload: VideoAnalysisRequest = callbackUrl
        ? { ...payload, callbackUrl }
        : payload;

      const headers = this.buildHmacHeaders(enrichedPayload);
      await firstValueFrom(this.http.post('/api/v1/analyze', enrichedPayload, { headers }));
      this.logger.log(`Dispatched post ${payload.videoId} to Video analysis service`);
      return { dispatched: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Video Analysis dispatch failed for post ${payload.videoId}: ${msg}: ${JSON.stringify(err.response?.data || {})}`,
      );
      return { dispatched: false, error: msg };
    }
  }

  private buildHmacHeaders(payload: VideoAnalysisRequest): Record<string, string> {
    const { secret } = this.configService.internalHmacConfig;
    const ts = DateTime.utc().toUnixInteger().toString();
    const rawBody = JSON.stringify(payload);
    const sig = createHmac('sha256', secret).update(rawBody).digest('hex');

    return {
      'x-timestamp': ts,
      'x-signature': `sha256=${sig}`,
    };
  }
}
