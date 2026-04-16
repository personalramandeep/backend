import { ERole } from '@app/common';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IAuthenticatedUser } from '../auth/auth.types';
import { User } from '../auth/decorators/user.decorator';
import { Roles } from '../authorization/decorators/roles.decorator';
import { StreakService } from './streak.service';

@ApiTags('Streaks')
@ApiBearerAuth()
@Controller('/streaks')
@Roles(ERole.PLAYER, ERole.COACH)
export class StreakController {
  constructor(private readonly streakService: StreakService) {}

  @Get('/me')
  @ApiOperation({ summary: 'Get my upload streak summary' })
  getMyStreak(@User() authUser: IAuthenticatedUser) {
    return this.streakService.getStreakSummary(authUser.id);
  }
}
