import { PG_ENTITIES } from '@app/common';
import { BullModule } from '@nestjs/bullmq';
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { AiCoachModule } from './ai-coach/ai-coach.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/guards/auth.guard';
import { AuthorizationModule } from './authorization/authorization.module';
import { RolesGuard } from './authorization/guards/roles.guard';
import { BillingModule } from './billing/billing.module';
import { CoachReviewModule } from './coach-review/coach-review.module';
import { CoachModule } from './coach/coach.module';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { DashboardModule } from './dashboard/dashboard.module';
import { EntitlementsModule } from './entitlements/entitlements.module';
import { FavoritesModule } from './favorites/favorites.module';
import { HealthModule } from './health/health.module';
import { HttpCacheInterceptor } from './infra/interceptors/http-cache.interceptor';
import { ShutdownService } from './infra/shutdown.service';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { LlmModule } from './llm/llm.module';
import { MediaModule } from './media/media.module';
import { PaymentsModule } from './payments/payments.module';
import { PlayersModule } from './players/players.module';
import { PostModule } from './post/post.module';
import { PricingModule } from './pricing/pricing.module';
import { RedisModule } from './redis/redis.module';
import { ReferralModule } from './referral/referral.module';
import { SportModule } from './sport/sport.module';
import { StorageModule } from './storage/storage.module';
import { StreakModule } from './streak/streak.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UserModule } from './user/user.module';
import { UtilsModule } from './utils/utils.module';
import { VideoAnalysisModule } from './video-analysis/video-analysis.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    // ── Infrastructure ──
    ConfigModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        throttlers: [{ ttl: 60 * 1000, limit: 100 }],
      }),
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      maxListeners: 20,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('PG_URI'),
        entities: PG_ENTITIES,
        autoLoadEntities: true,
        logging: !configService.isProduction,
        synchronize: false,
        logger: 'file',
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.redisConfig.uri,
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    RedisModule,

    // ── Cross-cutting ───
    HealthModule,
    AuthorizationModule,
    AuthModule,
    StorageModule,
    UtilsModule,
    LlmModule,

    // ── Domain modules ──
    UserModule,
    CoachModule,
    MediaModule,
    SportModule,
    PostModule,
    StreakModule,
    AiCoachModule,
    PricingModule,
    PaymentsModule,
    SubscriptionsModule,
    EntitlementsModule,
    WebhooksModule,
    BillingModule,
    CoachReviewModule,
    ReferralModule,
    FavoritesModule,
    LeaderboardModule,
    VideoAnalysisModule,
    DashboardModule,
    PlayersModule,
    AdminModule,
  ],
  controllers: [],
  providers: [
    ShutdownService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: HttpCacheInterceptor },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    },
  ],
})
export class AppModule {}
