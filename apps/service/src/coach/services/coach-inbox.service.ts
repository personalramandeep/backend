import {
  CoachFeedbackItemEntity,
  CoachReviewRequestEntity,
  EReviewRequestStatus,
} from '@app/common';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Repository } from 'typeorm';
import { StorageService } from '../../storage/storage.service';
import { CreateFeedbackItemDto, DrillItemDto } from '../dtos/create-feedback-item.dto';
import { ListReviewRequestsDto } from '../dtos/list-review-requests.dto';
import { UpdateReviewRequestDto } from '../dtos/update-review-request.dto';

@Injectable()
export class CoachInboxService {
  constructor(
    @InjectRepository(CoachReviewRequestEntity)
    private readonly reviewRepository: Repository<CoachReviewRequestEntity>,
    @InjectRepository(CoachFeedbackItemEntity)
    private readonly feedbackRepository: Repository<CoachFeedbackItemEntity>,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getCoachRequests(
    coachUserId: string,
    query: ListReviewRequestsDto,
  ): Promise<{
    data: CoachReviewRequestEntity[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const qb = this.reviewRepository
      .createQueryBuilder('req')
      .leftJoinAndSelect('req.player', 'player')
      .where('req.coach_user_id = :coachUserId', { coachUserId })
      .orderBy('req.created_at', 'DESC');

    if (query.status) {
      qb.andWhere('req.status = :status', { status: query.status });
    }

    if (query.limit) qb.take(query.limit);
    if (query.offset) qb.skip(query.offset);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, limit: query.limit || 50, offset: query.offset || 0 };
  }

  async getCoachRequestById(coachUserId: string, id: string): Promise<CoachReviewRequestEntity> {
    const request = await this.reviewRepository.findOne({
      where: { id, coach_user_id: coachUserId },
      relations: ['player', 'feedbackItems'],
    });

    if (!request) {
      throw new NotFoundException('Review request not found');
    }

    return request;
  }

  async updateReviewRequest(
    coachUserId: string,
    id: string,
    dto: UpdateReviewRequestDto,
  ): Promise<CoachReviewRequestEntity> {
    const request = await this.getCoachRequestById(coachUserId, id);
    const oldStatus = request.status;

    if (dto.status === EReviewRequestStatus.IN_REVIEW) {
      if (oldStatus !== EReviewRequestStatus.PENDING) {
        throw new BadRequestException('Can only move to in_review from pending');
      }
    }

    if (dto.status === EReviewRequestStatus.COMPLETED) {
      if (![EReviewRequestStatus.PENDING, EReviewRequestStatus.IN_REVIEW].includes(oldStatus)) {
        throw new BadRequestException('Cannot complete this request');
      }
      if (!request.feedbackItems || request.feedbackItems.length === 0) {
        throw new BadRequestException('Cannot complete a review without any feedback items');
      }
      request.submitted_at = DateTime.utc().toJSDate();
    }

    if (dto.status === EReviewRequestStatus.REJECTED) {
      if (![EReviewRequestStatus.PENDING, EReviewRequestStatus.IN_REVIEW].includes(oldStatus)) {
        throw new BadRequestException('Cannot reject this request');
      }
    }

    request.status = dto.status;
    const updated = await this.reviewRepository.save(request);

    if (
      updated.status === EReviewRequestStatus.COMPLETED &&
      oldStatus !== EReviewRequestStatus.COMPLETED
    ) {
      this.eventEmitter.emit('coach_review.completed', {
        reviewRequestId: updated.id,
        playerUserId: updated.player_user_id,
        postId: updated.post_id,
      });
    }

    return updated;
  }

  async addFeedbackItem(
    coachUserId: string,
    requestId: string,
    dto: CreateFeedbackItemDto,
  ): Promise<
    {
      review_request_id: string;
      video_timestamp_seconds: number | undefined;
      comment: string;
      tags: string[];
      drills: DrillItemDto[];
    } & CoachFeedbackItemEntity
  > {
    const request = await this.reviewRepository.findOne({
      where: { id: requestId, coach_user_id: coachUserId },
      select: ['id', 'status'],
    });

    if (!request) throw new NotFoundException('Review request not found');
    if (![EReviewRequestStatus.PENDING, EReviewRequestStatus.IN_REVIEW].includes(request.status)) {
      throw new ForbiddenException('Cannot add feedback to a completed or cancelled request');
    }

    const item = await this.feedbackRepository.save({
      review_request_id: requestId,
      video_timestamp_seconds: dto.video_timestamp_seconds,
      comment: dto.comment,
      tags: dto.tags || [],
      drills: dto.drills || [],
    });

    return item;
  }

  async deleteFeedbackItem(
    coachUserId: string,
    requestId: string,
    itemId: string,
  ): Promise<{
    success: boolean;
  }> {
    const request = await this.reviewRepository.findOne({
      where: { id: requestId, coach_user_id: coachUserId },
      select: ['id', 'status'],
    });

    if (!request) throw new NotFoundException('Review request not found');
    if (![EReviewRequestStatus.PENDING, EReviewRequestStatus.IN_REVIEW].includes(request.status)) {
      throw new ForbiddenException('Cannot modify feedback on a completed or cancelled request');
    }

    const item = await this.feedbackRepository.findOne({
      where: { id: itemId, review_request_id: requestId },
    });
    if (!item) throw new NotFoundException('Feedback item not found');

    await this.feedbackRepository.delete(itemId);
    return { success: true };
  }

  async uploadAnnotation(
    coachUserId: string,
    requestId: string,
    itemId: string,
    file: Express.Multer.File,
  ): Promise<{ annotation_url: string }> {
    const request = await this.reviewRepository.findOne({
      where: { id: requestId, coach_user_id: coachUserId },
      select: ['id', 'status'],
    });

    if (!request) throw new NotFoundException('Review request not found');
    if (![EReviewRequestStatus.PENDING, EReviewRequestStatus.IN_REVIEW].includes(request.status)) {
      throw new ForbiddenException('Cannot modify feedback on a completed or cancelled request');
    }

    const item = await this.feedbackRepository.findOne({
      where: { id: itemId, review_request_id: requestId },
    });
    if (!item) throw new NotFoundException('Feedback item not found');

    const objectKey = await this.storageService.uploadBuffer(
      'coach-annotations',
      file.buffer,
      file.mimetype,
      'png',
    );

    item.annotation_url = objectKey;
    await this.feedbackRepository.save(item);

    return { annotation_url: this.storageService.buildPublicUrl(objectKey) };
  }
}
