import { ERole } from '@app/common';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserId } from '../auth/decorators/user.decorator';
import { Roles } from '../authorization/decorators/roles.decorator';
import { HttpCache } from '../infra/decorators/http-cache.decorator';
import { PlayerAnalyticsService } from './player-analytics.service';

@ApiTags('Players')
@ApiBearerAuth()
@Controller('/players')
@Roles(ERole.PLAYER, ERole.PARENT, ERole.COACH, ERole.ADMIN)
export class PlayersController {
  constructor(private readonly playerAnalyticsService: PlayerAnalyticsService) {}

  @Get('/me/activity')
  @HttpCache(300)
  @Roles(ERole.PLAYER)
  @ApiOperation({ summary: 'Activity heatmap for the current calendar year, and the best month.' })
  getActivityHeatmap(@UserId() userId: string) {
    return this.playerAnalyticsService.getActivityHeatmap(userId);
  }

  @Get('/me/score-trend')
  @HttpCache(120)
  @Roles(ERole.PLAYER)
  @ApiOperation({ summary: 'All-time AI score trend.' })
  getScoreTrend(@UserId() userId: string) {
    return this.playerAnalyticsService.getScoreTrend(userId);
  }
}
