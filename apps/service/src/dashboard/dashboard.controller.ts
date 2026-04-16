import { ERole } from '@app/common';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserId } from '../auth/decorators/user.decorator';
import { Roles } from '../authorization/decorators/roles.decorator';
import { HttpCache } from '../infra/decorators/http-cache.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('/dashboard')
@Roles(ERole.PLAYER, ERole.PARENT, ERole.COACH, ERole.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('/stats')
  @HttpCache(30)
  @ApiOperation({
    summary:
      'dashboard stats (total_videos, avg_ai_score, rank, streak, improvement_pct). Responses are HTTP-cached.',
  })
  getStats(@UserId() userId: string) {
    return this.dashboardService.getStats(userId);
  }
}
