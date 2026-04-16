import { CoachProfileEntity, CoachReviewRequestEntity, EReviewRequestStatus } from '@app/common';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostService } from '../post/post.service';
import { StorageService } from '../storage/storage.service';
import { CreateReviewRequestDto } from './dtos/create-review-request.dto';
import { CoachReviewRepository } from './repositories/coach-review.repository';

@Injectable()
export class CoachReviewService {
  constructor(
    private readonly coachReviewRepository: CoachReviewRepository,
    private readonly postService: PostService,
    private readonly storageService: StorageService,
    @InjectRepository(CoachProfileEntity)
    private readonly coachProfileRepository: Repository<CoachProfileEntity>,
  ) {}

  async createReviewRequest(
    playerId: string,
    dto: CreateReviewRequestDto,
  ): Promise<CoachReviewRequestEntity> {
    const post = await this.postService.getPostById(dto.post_id);
    if (!post) {
      throw new NotFoundException('Video post not found');
    }
    if (post.userId !== playerId) {
      throw new ForbiddenException('You can only request reviews for your own videos');
    }
    if (dto.coach_user_id === playerId) {
      throw new ForbiddenException('You cannot submit a review to yourself');
    }

    const coachProfile = await this.coachProfileRepository.findOne({
      where: { user_id: dto.coach_user_id, is_published: true },
    });
    if (!coachProfile) {
      throw new NotFoundException('Coach not found or not published');
    }

    try {
      const request = await this.coachReviewRepository.save({
        player_user_id: playerId,
        coach_user_id: dto.coach_user_id,
        post_id: dto.post_id,
        player_message: dto.player_message,
        status: EReviewRequestStatus.PENDING,
      });
      return request;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException('You have already submitted this video to this coach');
      }
      throw error;
    }
  }

  async getMyRequests(playerId: string, postId?: string): Promise<CoachReviewRequestEntity[]> {
    return this.coachReviewRepository.find({
      where: {
        player_user_id: playerId,
        ...(postId ? { post_id: postId } : {}),
      },
      relations: ['coach'],
      order: { created_at: 'DESC' },
    });
  }

  async cancelRequest(playerId: string, requestId: string): Promise<void> {
    const request = await this.coachReviewRepository.findOne({
      where: { id: requestId, player_user_id: playerId },
    });

    if (!request) {
      throw new NotFoundException('Review request not found');
    }

    if (request.status !== EReviewRequestStatus.PENDING) {
      throw new ForbiddenException('You can only cancel pending review requests');
    }

    request.status = EReviewRequestStatus.CANCELLED;
    await this.coachReviewRepository.save(request);
  }

  async getAvailableCoaches() {
    // TODO: abstraction point for subscribed vs non-subscribed coaches
    const profiles = await this.coachProfileRepository.find({
      where: { is_published: true },
      relations: ['user'],
    });

    return profiles.map((c) => ({
      user_id: c.user_id,
      full_name: c.user.full_name,
      username: c.user.username,
      profile_pic_url: this.storageService.buildOptionalPublicUrl(c.user.profile_pic_url),
      specialization: c.specialization,
      hourly_rate: c.hourly_rate,
    }));
  }
}
