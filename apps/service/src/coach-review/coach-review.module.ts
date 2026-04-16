import {
  CoachProfileEntity,
  CoachRatingEntity,
  CoachRatingSummaryEntity,
  CoachReviewRequestEntity,
} from '@app/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostModule } from '../post/post.module';
import { StorageModule } from '../storage/storage.module';
import { CoachReviewController } from './coach-review.controller';
import { CoachReviewService } from './coach-review.service';
import { CoachRatingController } from './ratings/coach-rating.controller';
import { CoachRatingRepository } from './ratings/coach-rating.repository';
import { CoachRatingService } from './ratings/coach-rating.service';
import { CoachReviewRepository } from './repositories/coach-review.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CoachProfileEntity,
      CoachReviewRequestEntity,
      CoachRatingEntity,
      CoachRatingSummaryEntity,
    ]),
    PostModule,
    StorageModule,
  ],
  controllers: [CoachReviewController, CoachRatingController],
  providers: [CoachReviewService, CoachReviewRepository, CoachRatingService, CoachRatingRepository],
  exports: [CoachReviewService, CoachRatingService, CoachRatingRepository],
})
export class CoachReviewModule {}
