import { Module } from '@nestjs/common';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { PlayersModule } from '../players/players.module';
import { PostModule } from '../post/post.module';
import { StreakModule } from '../streak/streak.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [PostModule, LeaderboardModule, StreakModule, PlayersModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
