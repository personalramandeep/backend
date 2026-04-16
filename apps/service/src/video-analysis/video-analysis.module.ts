import {
  CoachReviewRequestEntity,
  PlayerProfileEntity,
  PlayerSportEntity,
  PostEntity,
  PostSchema,
  VideoAnalysisEntity,
  VideoAnalysisSchema,
} from '@app/common';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { StorageModule } from '../storage/storage.module';
import { AnalysisRetryJob } from './jobs/analysis-retry.job';
import { VideoAnalysisRepository } from './repositories/video-analysis.repository';
import { VideoAnalysisClient } from './services/video-analysis-client.service';
import { VideoAnalysisService } from './services/video-analysis.service';
import { VideoInsightsPromptBuilder } from './services/video-insights-prompt.builder';
import { VideoInsightsService } from './services/video-insights.service';
import { VideoAnalysisController } from './video-analysis.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PostEntity.name, schema: PostSchema },
      { name: VideoAnalysisEntity.name, schema: VideoAnalysisSchema },
    ]),
    TypeOrmModule.forFeature([PlayerProfileEntity, PlayerSportEntity, CoachReviewRequestEntity]),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.videoAnalysisSvcConfig.baseUrl,
        timeout: config.videoAnalysisSvcConfig.timeoutMs,
        headers: { 'Content-Type': 'application/json' },
      }),
    }),
    ConfigModule,
    AuthModule,
    StorageModule,
    LeaderboardModule,
  ],
  controllers: [VideoAnalysisController],
  providers: [
    VideoAnalysisService,
    VideoAnalysisRepository,
    VideoAnalysisClient,
    AnalysisRetryJob,
    VideoInsightsService,
    VideoInsightsPromptBuilder,
  ],
  exports: [VideoAnalysisService],
})
export class VideoAnalysisModule {}
