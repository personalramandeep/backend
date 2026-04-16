import {
  CoachProfileEntity,
  CoachRatingEntity,
  CoachReviewRequestEntity,
  EReviewRequestStatus,
} from '@app/common';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheKeyBuilder } from '../../redis/cache/cache-key.builder';
import { CacheService } from '../../redis/cache/cache.service';
import { StorageService } from '../../storage/storage.service';
import { CoachRatingRepository, RatingCursor } from './coach-rating.repository';
import { GetRatingsQueryDto } from './dtos/get-ratings-query.dto';
import { SubmitRatingDto } from './dtos/submit-rating.dto';

const SUMMARY_TTL_SECONDS = 5 * 60;
const SUMMARY_NAMESPACE = 'coach:rating_summary';

export interface RatingSummaryResponse {
  avg_rating: number;
  total_count: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface RatingListItem {
  id: string;
  rating: number;
  review_text: string | null;
  tags: string[];
  player_name: string | null;
  player_username: string | null;
  player_profile_pic_url: string | null;
  created_at: string;
}

const EMPTY_SUMMARY: RatingSummaryResponse = {
  avg_rating: 0,
  total_count: 0,
  distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
};

@Injectable()
export class CoachRatingService {
  private readonly logger = new Logger(CoachRatingService.name);

  constructor(
    @InjectRepository(CoachReviewRequestEntity)
    private readonly reviewRequestRepo: Repository<CoachReviewRequestEntity>,

    @InjectRepository(CoachProfileEntity)
    private readonly coachProfileRepo: Repository<CoachProfileEntity>,

    private readonly ratingRepository: CoachRatingRepository,
    private readonly cacheService: CacheService,
    private readonly cacheKeyBuilder: CacheKeyBuilder,
    private readonly storageService: StorageService,
  ) {}

  async submitRating(
    playerId: string,
    dto: SubmitRatingDto,
  ): Promise<{ rating: CoachRatingEntity; alreadyExisted: boolean }> {
    const reviewReq = await this.reviewRequestRepo.findOne({
      where: { id: dto.review_request_id },
      select: ['id', 'player_user_id', 'coach_user_id', 'status'],
    });

    if (!reviewReq) {
      throw new NotFoundException('Review request not found');
    }
    if (reviewReq.player_user_id !== playerId) {
      throw new ForbiddenException('You can only rate a session you participated in');
    }
    if (reviewReq.status !== EReviewRequestStatus.COMPLETED) {
      throw new BadRequestException('You can only rate a completed review session');
    }

    const inserted = await this.ratingRepository.insertOrIgnore({
      player_user_id: playerId,
      coach_user_id: reviewReq.coach_user_id,
      review_request_id: dto.review_request_id,
      rating: dto.rating,
      review_text: dto.review_text ?? null,
      tags: dto.tags ?? [],
    });

    if (inserted) {
      await this.bustSummaryCache(reviewReq.coach_user_id);
      return { rating: inserted, alreadyExisted: false };
    }

    const existing = await this.ratingRepository.findByRequestId(dto.review_request_id);
    return { rating: existing!, alreadyExisted: true };
  }

  async listRatings(
    coachUserId: string,
    query: GetRatingsQueryDto,
  ): Promise<{ data: RatingListItem[]; next_cursor: string | null }> {
    const limit = query.limit ?? 20;

    let cursor: RatingCursor | undefined;
    if (query.cursor) {
      try {
        cursor = JSON.parse(Buffer.from(query.cursor, 'base64').toString('utf8')) as RatingCursor;
      } catch {
        this.logger.warn(`Malformed rating cursor: ${query.cursor}`);
      }
    }

    const coachProfile = await this.coachProfileRepo.findOne({
      where: { user_id: coachUserId },
      select: ['hide_reviewer_identity'],
    });
    const hideIdentity = coachProfile?.hide_reviewer_identity ?? false;

    const sort = query.sort ?? 'recent';
    const rows = await this.ratingRepository.listForCoach(coachUserId, limit, sort, cursor, query.rating);

    const data: RatingListItem[] = rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      review_text: r.review_text,
      tags: r.tags ?? [],
      player_name: hideIdentity ? null : (r.player?.full_name ?? null),
      player_username: hideIdentity ? null : (r.player?.username ?? null),
      player_profile_pic_url: hideIdentity
        ? null
        : this.storageService.buildOptionalPublicUrl(r.player?.profile_pic_url ?? null),
      created_at: r.created_at.toISOString(),
    }));

    let next_cursor: string | null = null;
    if (sort === 'recent' && rows.length === limit) {
      const last = rows[rows.length - 1];
      next_cursor = Buffer.from(
        JSON.stringify({ created_at: last.created_at.toISOString(), id: last.id }),
      ).toString('base64');
    }

    return { data, next_cursor };
  }

  async getRatingSummary(coachUserId: string): Promise<RatingSummaryResponse> {
    const cacheKey = this.cacheKeyBuilder.buildExact(SUMMARY_NAMESPACE, coachUserId);

    return this.cacheService.getOrSet<RatingSummaryResponse>(
      cacheKey,
      async () => {
        const summary = await this.ratingRepository.findSummary(coachUserId);
        if (!summary) return EMPTY_SUMMARY;

        return {
          avg_rating: Number(summary.avg_rating),
          total_count: summary.total_count,
          distribution: {
            '1': summary.count_1,
            '2': summary.count_2,
            '3': summary.count_3,
            '4': summary.count_4,
            '5': summary.count_5,
          },
        };
      },
      SUMMARY_TTL_SECONDS,
    );
  }

  async getMyRating(
    playerId: string,
    reviewRequestId: string,
  ): Promise<{ rating: number; review_text: string | null; tags: string[] } | null> {
    const rating = await this.ratingRepository.findByRequestId(reviewRequestId);
    if (!rating || rating.player_user_id !== playerId) return null;
    return {
      rating: rating.rating,
      review_text: rating.review_text,
      tags: rating.tags ?? [],
    };
  }

  private async bustSummaryCache(coachUserId: string): Promise<void> {
    const cacheKey = this.cacheKeyBuilder.buildExact(SUMMARY_NAMESPACE, coachUserId);
    await this.cacheService.del(cacheKey);
  }
}
