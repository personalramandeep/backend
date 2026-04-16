import { AuthProviderEntity } from './auth';
import {
  FeatureEntity,
  PaymentOrderEntity,
  PaymentTransactionEntity,
  PlanEntity,
  PlanFeatureEntity,
  PriceEntity,
  ProductEntity,
  QuotaUsageEntity,
  SubscriptionEntity,
  WebhookEventEntity,
} from './billing';
import {
  CoachFeedbackItemEntity,
  CoachRatingEntity,
  CoachRatingSummaryEntity,
  CoachReviewRequestEntity,
} from './coach-review';
import { UserFavoriteEntity } from './favorites';
import {
  GeoProfileEntity,
  PlayerPerformanceEventEntity,
  PlayerPerformanceScoreEntity,
  PlayerSkillScoreEntity,
  UniversalPerformanceScoreEntity,
} from './leaderboard';
import { CoachProfileEntity, ParentProfileEntity, PlayerProfileEntity } from './profile';
import { ReferralBonusEntity, ReferralCodeEntity, ReferralEntity } from './referral';
import { RoleEntity, UserRoleEntity } from './role';
import { PlayerSportEntity, SportEntity, SportMetricEntity } from './sport';
import { UserEntity, UserRelationshipEntity, UserSessionEntity } from './user';

export * from './ai-coach';
export * from './auth';
export * from './billing';
export * from './coach-review';
export * from './common.module';
export * from './common.service';
export * from './favorites';
export * from './leaderboard';
export * from './media';
export * from './post';
export * from './profile';
export * from './referral';
export * from './role';
export * from './sport';
export * from './streak';
export * from './user';
export * from './video-analysis';

export const PG_ENTITIES = [
  AuthProviderEntity,
  CoachProfileEntity,
  ParentProfileEntity,
  PlayerProfileEntity,
  RoleEntity,
  UserRoleEntity,
  SportEntity,
  SportMetricEntity,
  PlayerSportEntity,
  UserEntity,
  UserSessionEntity,
  UserRelationshipEntity,
  // Billing system entities
  ProductEntity,
  PlanEntity,
  PriceEntity,
  FeatureEntity,
  PlanFeatureEntity,
  SubscriptionEntity,
  PaymentOrderEntity,
  PaymentTransactionEntity,
  QuotaUsageEntity,
  WebhookEventEntity,
  // Coach review entities
  CoachReviewRequestEntity,
  CoachFeedbackItemEntity,
  CoachRatingEntity,
  CoachRatingSummaryEntity,
  // Referral entities
  ReferralCodeEntity,
  ReferralEntity,
  ReferralBonusEntity,
  // Leaderboard entities
  PlayerPerformanceEventEntity,
  PlayerPerformanceScoreEntity,
  PlayerSkillScoreEntity,
  UniversalPerformanceScoreEntity,
  GeoProfileEntity,
  // Favorites
  UserFavoriteEntity,
];
