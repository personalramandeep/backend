import {
  GeoProfileEntity,
  LeaderboardSnapshotEntity,
  LeaderboardSnapshotSchema,
  PlayerPerformanceEventEntity,
  PlayerPerformanceScoreEntity,
  PlayerSkillScoreEntity,
  UniversalPerformanceScoreEntity,
} from '@app/common';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { RedisModule } from '../redis/redis.module';
import { StorageModule } from '../storage/storage.module';
import { UserModule } from '../user/user.module';
import { LeaderboardSnapshotJob } from './jobs/leaderboard-snapshot.job';
import { LeaderboardAdminController } from './leaderboard-admin.controller';
import { LeaderboardController } from './leaderboard.controller';
import { PerformanceApplyProcessor } from './processors/performance-apply.processor';
import { LeaderboardSnapshotRepository } from './repositories/leaderboard-snapshot.repository';
import { PlayerPerformanceEventRepository } from './repositories/player-performance-event.repository';
import { PlayerPerformanceScoreRepository } from './repositories/player-performance-score.repository';
import { PlayerSkillScoreRepository } from './repositories/player-skill-score.repository';
import { UniversalPerformanceScoreRepository } from './repositories/universal-performance-score.repository';
import { LeaderboardReadService } from './services/leaderboard-read.service';
import { LeaderboardRebuildService } from './services/leaderboard-rebuild.service';
import { LeaderboardRedisService } from './services/leaderboard-redis.service';
import { LEADERBOARD_QUEUE, LeaderboardWriteService } from './services/leaderboard-write.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlayerPerformanceEventEntity,
      PlayerPerformanceScoreEntity,
      UniversalPerformanceScoreEntity,
      PlayerSkillScoreEntity,
      GeoProfileEntity,
    ]),
    MongooseModule.forFeature([
      { name: LeaderboardSnapshotEntity.name, schema: LeaderboardSnapshotSchema },
    ]),
    BullModule.registerQueue({ name: LEADERBOARD_QUEUE }),
    ConfigModule,
    RedisModule,
    StorageModule,
    UserModule,
  ],
  controllers: [LeaderboardController, LeaderboardAdminController],
  providers: [
    LeaderboardWriteService,
    LeaderboardReadService,
    LeaderboardRebuildService,
    LeaderboardRedisService,
    PerformanceApplyProcessor,
    LeaderboardSnapshotJob,
    PlayerPerformanceEventRepository,
    PlayerPerformanceScoreRepository,
    UniversalPerformanceScoreRepository,
    PlayerSkillScoreRepository,
    LeaderboardSnapshotRepository,
  ],
  exports: [
    LeaderboardWriteService,
    LeaderboardReadService,
    LeaderboardRebuildService,
    UniversalPerformanceScoreRepository,
    LeaderboardRedisService,
    PlayerPerformanceEventRepository,
    PlayerPerformanceScoreRepository,
  ],
})
export class LeaderboardModule {}
