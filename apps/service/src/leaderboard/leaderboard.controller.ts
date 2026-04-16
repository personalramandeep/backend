import { ERole } from '@app/common';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserId } from '../auth/decorators/user.decorator';
import { Roles } from '../authorization/decorators/roles.decorator';
import { AroundMeQueryDto, LeaderboardQueryDto } from './dtos/leaderboard-query.dto';
import { LeaderboardReadService } from './services/leaderboard-read.service';

@ApiTags('Leaderboard')
@ApiBearerAuth()
@Controller('/leaderboard')
@Roles(ERole.PLAYER, ERole.PARENT, ERole.COACH, ERole.ADMIN)
export class LeaderboardController {
  constructor(private readonly readService: LeaderboardReadService) {}

  @Get('/')
  @ApiOperation({ summary: 'Full paginated leaderboard' })
  getLeaderboard(@UserId() userId: string, @Query() query: LeaderboardQueryDto) {
    return this.readService.getLeaderboard(
      userId,
      query.sport_id,
      query.offset ?? 0,
      query.limit ?? 50,
    );
  }

  @Get('/me')
  @ApiOperation({ summary: 'My rank, score, and score delta' })
  getMyRank(@UserId() userId: string, @Query() query: LeaderboardQueryDto) {
    return this.readService.getMyRank(userId, query.sport_id);
  }

  @Get('/around-me')
  @ApiOperation({ summary: 'Players within ±radius ranks of the requesting user' })
  getAroundMe(@UserId() userId: string, @Query() query: AroundMeQueryDto) {
    return this.readService.getAroundMe(userId, query.sport_id, query.radius ?? 3);
  }

  @Get('/widget')
  @ApiOperation({ summary: 'Compact top-10 leaderboard for dashboard widget (60s cache)' })
  getWidget(@UserId() userId: string, @Query() query: LeaderboardQueryDto) {
    return this.readService.getWidget(userId, query.sport_id);
  }
}
