import { EMediaStatus, EPostMediaType, EPostStatus, EStreakType, PostDocument } from '@app/common';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QuotaUsageService } from '../entitlements/quota-usage.service';
import { MediaService } from '../media/media.service';
import { SportService } from '../sport/sport.service';
import { StorageService } from '../storage/storage.service';
import { StreakService } from '../streak/streak.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { VideoAnalysisService } from '../video-analysis/services/video-analysis.service';
import { CreatePostDto } from './dtos/create-post.dto';
import { PostRepository } from './repositories/post.repository';

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  constructor(
    private readonly postRepository: PostRepository,
    private readonly mediaService: MediaService,
    private readonly sportService: SportService,
    private readonly storageService: StorageService,
    private readonly streakService: StreakService,
    private readonly videoAnalysisService: VideoAnalysisService,
    // TODO:
    private readonly quotaUsageService: QuotaUsageService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async onModuleInit() {
    // const post = await this.postRepository.findById('69db97de7d00262ed6428bb0');
    // if (!post) return;
    // await this.videoAnalysisService.dispatch(post);
  }

  private resolveMediaUrl(post: PostDocument): PostDocument {
    post.media = post.media.map((m) => ({
      ...m,
      url: this.storageService.buildPublicUrl(m.url),
    }));
    return post;
  }

  async createPost(userId: string, dto: CreatePostDto): Promise<PostDocument> {
    const { mediaId, visibility, caption, sportId, gameType, cameraView, videoType } = dto;

    await this.sportService.ensurePlayerCanUseSport(userId, sportId);

    if (gameType || cameraView) {
      const sport = await this.sportService.getActiveSport(sportId);

      if (gameType && sport.postOptions?.gameTypes?.length) {
        const allowed = sport.postOptions.gameTypes.filter((o) => o.enabled).map((o) => o.value);
        if (!allowed.includes(gameType)) {
          throw new BadRequestException(`gameType "${gameType}" is not supported for this sport`);
        }
      }

      if (cameraView && sport.postOptions?.cameraViews?.length) {
        const allowed = sport.postOptions.cameraViews.filter((o) => o.enabled).map((o) => o.value);
        if (!allowed.includes(cameraView)) {
          throw new BadRequestException(
            `cameraView "${cameraView}" is not supported for this sport`,
          );
        }
      }
    }

    const media = await this.mediaService.lockSession({
      mediaId,
      userId,
      fromStatus: EMediaStatus.UPLOADED,
      toStatus: EMediaStatus.PROCESSING,
    });

    if (!media) {
      throw new BadRequestException('Media not found or not ready');
    }

    const mediaDocs = [media];
    const alreadyLinked = mediaDocs.some((m) => m.linkedPostId);
    if (alreadyLinked) {
      throw new BadRequestException('Media already attached');
    }

    const post = await this.postRepository.create({
      userId,
      sportId,
      caption,
      visibility,
      status: EPostStatus.PROCESSING,
      metadata: {
        videoType,
        gameType,
        cameraView,
      },
      media: mediaDocs.map((m) => ({
        type: EPostMediaType.VIDEO,
        url: m.objectKey,
        mimeType: m.mimeType,
      })),
    });

    await this.mediaService.attachToPost(
      mediaDocs.map((m) => m._id),
      post._id,
    );

    // TODO: Events
    this.streakService
      .recordEvent(userId, EStreakType.POST_UPLOAD, post._id.toString())
      .catch((err: Error) => this.logger.error('Failed to record streak event', err));

    void this.videoAnalysisService.dispatch(post);

    return this.resolveMediaUrl(post);
  }

  async getMyPosts(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: PostDocument[]; total: number; page: number; pageSize: number }> {
    const { data, total } = await this.postRepository.findByUserIdPaginated(userId, page, pageSize);
    return {
      data: data.map((post) => this.resolveMediaUrl(post)),
      total,
      page,
      pageSize,
    };
  }

  async getPostById(id: string): Promise<PostDocument> {
    const post = await this.postRepository.findById(id);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return this.resolveMediaUrl(post);
  }

  async deletePost(userId: string, postId: string): Promise<void> {
    const deleted = await this.postRepository.softDelete(postId, userId);
    if (!deleted) {
      throw new NotFoundException('Post not found');
    }
  }

  async deleteAllPosts(userId: string): Promise<{ deletedCount: number }> {
    const deletedCount = await this.postRepository.softDeleteAll(userId);
    return { deletedCount };
  }

  async getAnalysis(postId: string, userId: string) {
    return this.videoAnalysisService.getAnalysis(postId, userId);
  }
}
