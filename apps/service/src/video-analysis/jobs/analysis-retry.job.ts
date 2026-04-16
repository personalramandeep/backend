import { EPostStatus, PostDocument, PostEntity } from '@app/common';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { Model } from 'mongoose';
import { ConfigService } from '../../config/config.service';
import { VideoAnalysisService } from '../services/video-analysis.service';

const RETRY_BATCH_LIMIT = 100;

@Injectable()
export class AnalysisRetryJob {
  private readonly logger = new Logger(AnalysisRetryJob.name);

  constructor(
    @InjectModel(PostEntity.name)
    private readonly postModel: Model<PostDocument>,
    private readonly videoAnalysisService: VideoAnalysisService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('*/15 * * * *', { name: 'analysis-retry' })
  async retryStuckAnalyses(): Promise<void> {
    const { retryThresholdMinutes, maxRetryAttempts } = this.configService.videoAnalysisSvcConfig;
    const cutoff = DateTime.now().minus({ minutes: retryThresholdMinutes }).toJSDate();

    const stale = await this.postModel
      .find({
        status: EPostStatus.ANALYSING,
        deletedAt: null,
        updatedAt: { $lt: cutoff },
      })
      .limit(RETRY_BATCH_LIMIT)
      .exec();

    if (!stale.length) return;

    this.logger.log(
      `Found ${stale.length} post(s) stuck in ANALYSING (threshold: ${retryThresholdMinutes}min) — processing`,
    );

    await Promise.allSettled(stale.map((post) => this.processOne(post, maxRetryAttempts)));
  }

  private async processOne(post: PostDocument, maxRetryAttempts: number): Promise<void> {
    const postId = post._id.toString();
    const retryCount = post.analysisRetryCount ?? 0;

    if (retryCount >= maxRetryAttempts) {
      this.logger.warn(
        `Post ${postId} exceeded max retry attempts (${maxRetryAttempts}) — marking as ANALYSIS_FAILED`,
      );
      await this.videoAnalysisService.handleFailure(postId, {
        reason: 'max_retry_attempts_exceeded',
        attempts: retryCount,
      });
      return;
    }

    await this.postModel.findByIdAndUpdate(postId, { $inc: { analysisRetryCount: 1 } }).exec();

    await this.videoAnalysisService
      .dispatch(post)
      .catch((err: Error) =>
        this.logger.error(`Retry dispatch failed for post ${postId}: ${err.message}`),
      );
  }

  @Cron('*/15 * * * *', { name: 'insights-retry' })
  async retryFailedInsights(): Promise<void> {
    const { maxRetryAttempts } = this.configService.videoAnalysisSvcConfig;

    const stale = await this.postModel
      .find({
        status: EPostStatus.INSIGHTS_FAILED,
        deletedAt: null,
        insightsRetryCount: { $lt: maxRetryAttempts },
      })
      .limit(RETRY_BATCH_LIMIT)
      .exec();

    if (!stale.length) return;

    this.logger.log(`Found ${stale.length} post(s) in INSIGHTS_FAILED — retrying`);

    await Promise.allSettled(
      stale.map(async (post) => {
        const postId = post._id.toString();
        await this.postModel.findByIdAndUpdate(postId, { $inc: { insightsRetryCount: 1 } }).exec();
        await this.videoAnalysisService
          .retryInsights(postId)
          .catch((err: Error) =>
            this.logger.error(`[insights-retry] Failed for post ${postId}: ${err.message}`),
          );
      }),
    );
  }
}
