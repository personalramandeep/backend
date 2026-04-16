import {
  CoachReviewRequestEntity,
  EnginePayload,
  EPostStatus,
  EReviewRequestStatus,
  PostDocument,
  PostEntity,
  VideoAnalysisDocument,
  VideoAnalysisEntity,
} from '@app/common';
import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { Repository } from 'typeorm';
import { PlayerPerformanceScoreRepository } from '../../leaderboard/repositories/player-performance-score.repository';
import { LeaderboardWriteService } from '../../leaderboard/services/leaderboard-write.service';
import { StorageService } from '../../storage/storage.service';
import {
  CAMERA_VIEW_TO_RECORD_ANGLE,
  VideoAnalysisRequest,
} from '../dtos/video-analysis-request.dto';
import { VideoAnalysisResultDto } from '../dtos/video-analysis-result.dto';
import { VideoAnalysisRepository } from '../repositories/video-analysis.repository';
import { VideoAnalysisClient } from './video-analysis-client.service';
import { VideoInsightsService } from './video-insights.service';

@Injectable()
export class VideoAnalysisService {
  private readonly logger = new Logger(VideoAnalysisService.name);

  constructor(
    private readonly videoAnalysisRepo: VideoAnalysisRepository,
    private readonly videoAnalysisClient: VideoAnalysisClient,
    private readonly storageService: StorageService,
    private readonly leaderboardWriteService: LeaderboardWriteService,
    private readonly videoInsightsService: VideoInsightsService,
    private readonly perfScoreRepo: PlayerPerformanceScoreRepository,

    @InjectModel(PostEntity.name)
    private readonly postModel: Model<PostDocument>,

    @InjectRepository(CoachReviewRequestEntity)
    private readonly reviewRequestRepo: Repository<CoachReviewRequestEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    // const analysis = await this.videoAnalysisRepo.findByPostId('69dd23e88a8acfe300212d88');
    // console.log(analysis);
    // if (!analysis) return;
    // const postId = analysis.post_id;
    // void this.videoInsightsService
    //   .generate(analysis)
    //   .catch((err: Error) =>
    //     this.logger.error(`[insights] Unexpected error for post ${postId}`, err.stack),
    //   );
  }

  async dispatch(post: PostDocument): Promise<void> {
    const postId = post._id.toString();
    const videoMedia = post.media?.[0];

    if (!videoMedia) {
      this.logger.error(`Post ${postId} has no media — cannot dispatch`);
      await this.updatePostStatus(postId, EPostStatus.FAILED);
      return;
    }

    const videoUrl = this.storageService.buildGcsUri(videoMedia.url);

    const rawCameraView = post.metadata?.cameraView;
    const recordAngle = rawCameraView ? CAMERA_VIEW_TO_RECORD_ANGLE[rawCameraView] : undefined;

    if (rawCameraView && !recordAngle) {
      this.logger.warn(
        `Unknown cameraView '${rawCameraView}' for post ${postId} — omitting recordAngle`,
      );
    }

    const request: VideoAnalysisRequest = {
      postId,
      videoId: postId,
      userId: post.userId,
      filePath: videoUrl,
      recordAngle,
      videoType: post.metadata?.videoType,
      gameType: post.metadata?.gameType,
    };

    const result = await this.videoAnalysisClient.sendForAnalysis(request);

    // TODO: if client is on video page, should see status update in real time (future)
    if (result.dispatched) {
      await this.updatePostStatus(postId, EPostStatus.ANALYSING);
    } else {
      this.logger.error(`video analysis dispatch failed for post ${postId}: ${result.error}`);
      await this.updatePostStatus(postId, EPostStatus.FAILED);
    }
  }

  async handleResult(postId: string, dto: VideoAnalysisResultDto): Promise<{ accepted: true }> {
    const post = await this.postModel.findById(postId).exec();
    if (!post) {
      throw new NotFoundException(`Post ${postId} not found`);
    }

    if (post.deletedAt) {
      this.logger.warn(`Discarding analysis result for deleted post ${postId}`);
      return { accepted: true };
    }

    const enginePayload: EnginePayload = {
      record_angle: dto.record_angle,
      total_frames: dto.total_frames,
      shot_frames: dto.shot_frames ?? [],
      heatmap_path: dto.heatmap_path ?? null,
      step_count: dto.step_count,
      distance_travelled_m: dto.distance_travelled_m,
      duration: dto.duration,
      computed_score: dto.computed_score,
      sport_metrics: (dto.sport_metrics ?? {}) as Record<string, number>,
    };

    const savedDoc = await this.videoAnalysisRepo.upsert({
      post_id: postId,
      user_id: post.userId,
      sport_id: post.sportId,
      engine_payload: enginePayload,
      status: 'success',
      error_payload: null,
    } satisfies Partial<VideoAnalysisEntity>);

    await this.updatePostStatus(postId, EPostStatus.GENERATING_INSIGHTS);

    this.logger.log(`Engine callback received for post ${postId} — queuing insight generation`);

    void this.processInsights(savedDoc, post).catch((err: Error) =>
      this.logger.error(
        `[insights] Unhandled error in processInsights for post ${postId}`,
        err.stack,
      ),
    );

    return { accepted: true };
  }

  async retryInsights(postId: string): Promise<void> {
    const [post, analysis] = await Promise.all([
      this.postModel.findById(postId).exec(),
      this.videoAnalysisRepo.findByPostId(postId),
    ]);

    if (!post || !analysis) {
      this.logger.warn(`[insights-retry] Post or analysis not found for ${postId} — skipping`);
      return;
    }

    await this.processInsights(analysis, post);
  }

  private async processInsights(
    videoAnalysisDoc: VideoAnalysisDocument,
    post: PostDocument,
  ): Promise<void> {
    const postId = videoAnalysisDoc.post_id;
    try {
      const insights = await this.videoInsightsService.generate(videoAnalysisDoc);

      if (!insights) {
        this.logger.warn(
          `[insights] LLM returned null for post ${postId} — setting INSIGHTS_FAILED`,
        );
        await this.updatePostStatus(postId, EPostStatus.INSIGHTS_FAILED);
        return;
      }

      const currentPerf = await this.perfScoreRepo.findByUserAndSport(post.userId, post.sportId);
      const prevAvgScore = currentPerf?.avg_score ?? null;
      const vsAverage = prevAvgScore !== null ? insights.ai_score - prevAvgScore : null;

      await this.videoAnalysisRepo.saveScoreContext(postId, {
        prev_avg_score: prevAvgScore,
        vs_average: vsAverage,
      });

      await this.leaderboardWriteService.ingestScore(post.userId, postId, {
        sport_id: post.sportId,
        score: insights.ai_score,
        skill_scores: insights.skill_score as unknown as Record<string, number>,
      });

      await this.updatePostStatus(postId, EPostStatus.PUBLISHED);

      this.logger.log(
        `[insights] Post ${postId} published — ai_score: ${insights.ai_score}, user: ${post.userId}`,
      );
    } catch (err) {
      this.logger.error(
        `[insights] Unexpected error during insight processing for post ${postId}`,
        err instanceof Error ? err.stack : String(err),
      );
      await this.updatePostStatus(postId, EPostStatus.INSIGHTS_FAILED).catch(() => undefined);
    }
  }

  async handleFailure(postId: string, errorPayload: Record<string, unknown>): Promise<void> {
    const post = await this.postModel.findById(postId).exec();
    if (!post) return;

    if (post.deletedAt) {
      this.logger.warn(`Discarding analysis failure for deleted post ${postId}`);
      return;
    }

    await this.videoAnalysisRepo.upsert({
      post_id: postId,
      user_id: post.userId,
      sport_id: post.sportId,
      status: 'failed',
      error_payload: errorPayload,
    });

    await this.updatePostStatus(postId, EPostStatus.ANALYSIS_FAILED);
    this.logger.warn(`Analysis failed for post ${postId}: ${JSON.stringify(errorPayload)}`);
  }

  async getAnalysis(
    postId: string,
    requestingUserId: string,
  ): Promise<Record<string, unknown> & { heatmap_url: string | null }> {
    const analysis = await this.videoAnalysisRepo.findEnrichedByPostId(postId);
    if (!analysis) {
      throw new NotFoundException(`Analysis for post ${postId} not found`);
    }

    const isOwner = analysis.user_id === requestingUserId;
    if (!isOwner) {
      const coachRequest = await this.reviewRequestRepo.findOne({
        where: {
          post_id: postId,
          coach_user_id: requestingUserId,
        },
      });

      const coachAllowedStatuses: EReviewRequestStatus[] = [
        EReviewRequestStatus.IN_REVIEW,
        EReviewRequestStatus.COMPLETED,
        EReviewRequestStatus.PENDING,
      ];

      const hasAccess = coachRequest && coachAllowedStatuses.includes(coachRequest.status);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this analysis');
      }
    }

    const heatmap_url = analysis.engine_payload?.heatmap_path
      ? await this.storageService
          .buildSignedDownloadUrl(analysis.engine_payload.heatmap_path)
          .catch(() => null)
      : null;

    const payload = (analysis.engine_payload ?? {}) as EnginePayload;

    return Object.assign(analysis.toObject() as unknown as Record<string, unknown>, {
      heatmap_url,
      record_angle: payload.record_angle,
      total_frames: payload.total_frames,
      shot_frames: payload.shot_frames ?? [],
      heatmap_path: payload.heatmap_path ?? null,
      step_count: payload.step_count,
      distance_travelled_m: payload.distance_travelled_m,
      duration: payload.duration,
      sport_metrics: payload.sport_metrics ?? {},
      skill_score: analysis.ai_insights?.skill_score,
      score_context: analysis.score_context ?? null,
    });
  }

  private async updatePostStatus(postId: string, status: EPostStatus): Promise<void> {
    await this.postModel.findByIdAndUpdate(postId, { $set: { status } }).exec();
  }
}
