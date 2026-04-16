import { Module } from '@nestjs/common';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { PostModule } from '../post/post.module';
import { PlayerAnalyticsService } from './player-analytics.service';
import { PlayersController } from './players.controller';
import { PlayerMetricsService } from './services/player-metrics.service';

@Module({
  imports: [PostModule, LeaderboardModule],
  controllers: [PlayersController],
  providers: [PlayerAnalyticsService, PlayerMetricsService],
  exports: [PlayerMetricsService],
})
export class PlayersModule {}
