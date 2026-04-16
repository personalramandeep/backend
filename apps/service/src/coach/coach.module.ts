import {
  CoachFeedbackItemEntity,
  CoachProfileEntity,
  CoachRatingEntity,
  CoachRatingSummaryEntity,
  CoachReviewRequestEntity,
  UserEntity,
} from '@app/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoachRatingRepository } from '../coach-review/ratings/coach-rating.repository';
import { FavoritesModule } from '../favorites/favorites.module';
import { StorageModule } from '../storage/storage.module';
import { CoachController } from './coach.controller';
import { CoachInboxService } from './services/coach-inbox.service';
import { CoachService } from './services/coach.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CoachProfileEntity,
      UserEntity,
      CoachReviewRequestEntity,
      CoachFeedbackItemEntity,
      CoachRatingEntity,
      CoachRatingSummaryEntity,
    ]),
    StorageModule,
    FavoritesModule,
  ],
  controllers: [CoachController],
  providers: [CoachService, CoachInboxService, CoachRatingRepository],
  exports: [CoachService, CoachInboxService],
})
export class CoachModule {}
