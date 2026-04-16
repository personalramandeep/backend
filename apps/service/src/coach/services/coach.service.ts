import { CoachProfileEntity, FavoriteTargetType, UserEntity } from '@app/common';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoachRatingRepository } from '../../coach-review/ratings/coach-rating.repository';
import { FavoritesService } from '../../favorites/favorites.service';
import { StorageService } from '../../storage/storage.service';
import { ListCoachesDto } from '../dtos/list-coaches.dto';
import { UpdateCoachProfileDto } from '../dtos/update-coach-profile.dto';

@Injectable()
export class CoachService {
  constructor(
    @InjectRepository(CoachProfileEntity)
    private readonly coachProfileRepository: Repository<CoachProfileEntity>,

    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,

    private readonly storageService: StorageService,
    private readonly coachRatingRepository: CoachRatingRepository,
    private readonly favoritesService: FavoritesService,
  ) {}

  async listCoaches(filters: ListCoachesDto, viewerUserId?: string) {
    const { query, specialization, location, limit = 20, offset = 0 } = filters;

    const queryBuilder = this.coachProfileRepository.createQueryBuilder('coach');

    queryBuilder.leftJoinAndSelect('coach.user', 'user');
    queryBuilder.where('coach.is_published = :isPublished', { isPublished: true });

    if (specialization) {
      queryBuilder.andWhere('coach.specialization = :specialization', { specialization });
    }

    if (location) {
      queryBuilder.andWhere('coach.location = :location', { location });
    }

    if (query) {
      // Convert space-separated words into wildcard prefixes e.g "sumi sin" -> "sumi:* & sin:*"
      const formattedQuery = query
        .trim()
        .split(/\s+/)
        .map((word) => `${word}:*`)
        .join(' & ');

      queryBuilder.andWhere(
        `(to_tsvector('simple', 
          coalesce(user.full_name, '') || ' ' || 
          coalesce(coach.specialization, '') || ' ' || 
          coalesce(coach.location, '')
        ) @@ to_tsquery('simple', :formattedQuery))`,
        { formattedQuery },
      );
    }

    queryBuilder.limit(limit).offset(offset);

    // queryBuilder.orderBy('coach.verified', 'DESC');
    queryBuilder.addOrderBy('coach.experience_years', 'DESC', 'NULLS LAST');

    const [profiles, total] = await queryBuilder.getManyAndCount();

    const coachIds = profiles.map((p) => p.user_id);
    const summaryMap = await this.coachRatingRepository.findSummariesByCoachIds(coachIds);

    const favoriteSet = viewerUserId
      ? await this.favoritesService.getFavoriteSet(viewerUserId, FavoriteTargetType.COACH, coachIds)
      : new Set<string>();

    const data = profiles.map((profile) => {
      const summary = summaryMap.get(profile.user_id);
      return {
        bio: profile.bio,
        experience_years: profile.experience_years,
        specialization: profile.specialization,
        location: profile.location,
        hourly_rate: profile.hourly_rate,
        verified: profile.verified,
        user_id: profile.user_id,
        full_name: profile.user ? profile.user.full_name : undefined,
        username: profile.user?.username,
        profile_pic_url: this.storageService.buildOptionalPublicUrl(profile.user?.profile_pic_url),
        avg_rating: summary ? Number(summary.avg_rating) : 0,
        total_ratings: summary?.total_count ?? 0,
        total_sessions: summary?.total_sessions ?? 0,
        is_favorited: favoriteSet.has(profile.user_id),
      };
    });

    return {
      data,
      total,
      limit,
      offset,
    };
  }

  async getMyCoachProfile(userId: string) {
    const profile = await this.coachProfileRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('Coach profile not found.');
    }

    return {
      bio: profile.bio,
      experience_years: profile.experience_years,
      specialization: profile.specialization,
      location: profile.location,
      hourly_rate: profile.hourly_rate,
      is_published: profile.is_published,
      verified: profile.verified,
      user_id: profile.user_id,
      full_name: profile.user ? profile.user.full_name : undefined,
      username: profile.user?.username,
      profile_pic_url: this.storageService.buildOptionalPublicUrl(profile.user?.profile_pic_url),
    };
  }

  async updateMyCoachProfile(userId: string, data: UpdateCoachProfileDto) {
    const profile = await this.coachProfileRepository.findOne({ where: { user_id: userId } });

    if (!profile) {
      throw new NotFoundException('Coach profile not found.');
    }

    if (data.is_published !== undefined && data.is_published !== profile.is_published) {
      if (data.is_published && !profile.verified) {
        throw new BadRequestException('Only verified coaches can publish their profile.');
      }
    }

    Object.assign(profile, data);
    await this.coachProfileRepository.save(profile);

    return this.getMyCoachProfile(userId);
  }

  async getPublicCoachProfile(coachUserId: string, viewerUserId?: string) {
    const profile = await this.coachProfileRepository.findOne({
      where: { user_id: coachUserId, is_published: true },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('Coach not found or profile is not published.');
    }

    const summary = await this.coachRatingRepository.findSummary(coachUserId);

    const isFavorited = viewerUserId
      ? await this.favoritesService.isFavorited(viewerUserId, FavoriteTargetType.COACH, coachUserId)
      : false;

    return {
      bio: profile.bio,
      experience_years: profile.experience_years,
      specialization: profile.specialization,
      location: profile.location,
      hourly_rate: profile.hourly_rate,
      verified: profile.verified,
      user_id: profile.user_id,
      full_name: profile.user ? profile.user.full_name : undefined,
      username: profile.user?.username,
      profile_pic_url: this.storageService.buildOptionalPublicUrl(profile.user?.profile_pic_url),
      avg_rating: summary ? Number(summary.avg_rating) : 0,
      total_ratings: summary?.total_count ?? 0,
      total_sessions: summary?.total_sessions ?? 0,
      is_favorited: isFavorited,
    };
  }
}
