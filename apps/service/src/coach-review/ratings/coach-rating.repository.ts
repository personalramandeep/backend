import { CoachRatingEntity, CoachRatingSummaryEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

export interface RatingCursor {
  created_at: string;
  id: string;
}

@Injectable()
export class CoachRatingRepository {
  constructor(
    @InjectRepository(CoachRatingEntity)
    private readonly ratingRepo: Repository<CoachRatingEntity>,

    @InjectRepository(CoachRatingSummaryEntity)
    private readonly summaryRepo: Repository<CoachRatingSummaryEntity>,

    private readonly dataSource: DataSource,
  ) {}

  async insertOrIgnore(data: {
    player_user_id: string;
    coach_user_id: string;
    review_request_id: string;
    rating: number;
    review_text: string | null;
    tags: string[];
  }): Promise<CoachRatingEntity | null> {
    const result = await this.dataSource.query<CoachRatingEntity[]>(
      `INSERT INTO coach_ratings (player_user_id, coach_user_id, review_request_id, rating, review_text, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (review_request_id) DO NOTHING
       RETURNING *`,
      [
        data.player_user_id,
        data.coach_user_id,
        data.review_request_id,
        data.rating,
        data.review_text ?? null,
        data.tags ?? [],
      ],
    );
    return result[0] ?? null;
  }

  findByRequestId(reviewRequestId: string): Promise<CoachRatingEntity | null> {
    return this.ratingRepo.findOne({ where: { review_request_id: reviewRequestId } });
  }

  async listForCoach(
    coachUserId: string,
    limit: number,
    sort: 'recent' | 'top',
    cursor?: RatingCursor,
    rating?: number,
  ): Promise<CoachRatingEntity[]> {
    const qb = this.ratingRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.player', 'player')
      .where('r.coach_user_id = :coachUserId', { coachUserId })
      .andWhere('r.is_flagged = false');

    if (rating !== undefined) {
      qb.andWhere('r.rating = :rating', { rating });
    }

    qb.take(limit);

    if (sort === 'top') {
      qb.orderBy('r.rating', 'DESC').addOrderBy('r.created_at', 'DESC');
    } else {
      qb.orderBy('r.created_at', 'DESC').addOrderBy('r.id', 'DESC');

      if (cursor) {
        qb.andWhere(`(r.created_at, r.id) < (:cursorDate::timestamptz, :cursorId::uuid)`, {
          cursorDate: cursor.created_at,
          cursorId: cursor.id,
        });
      }
    }

    return qb.getMany();
  }

  findSummary(coachUserId: string): Promise<CoachRatingSummaryEntity | null> {
    return this.summaryRepo.findOne({ where: { coach_user_id: coachUserId } });
  }

  async findSummariesByCoachIds(
    coachUserIds: string[],
  ): Promise<Map<string, CoachRatingSummaryEntity>> {
    if (coachUserIds.length === 0) return new Map();
    const summaries = await this.summaryRepo
      .createQueryBuilder('s')
      .where('s.coach_user_id IN (:...ids)', { ids: coachUserIds })
      .getMany();
    return new Map(summaries.map((s) => [s.coach_user_id, s]));
  }
}
