import { ERole } from '@app/common';
import { Controller, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../authorization/decorators/roles.decorator';
import { LeaderboardRebuildService } from './services/leaderboard-rebuild.service';

@ApiTags('Leaderboard — Admin')
@ApiBearerAuth()
@Controller('/admin/leaderboard')
@Roles(ERole.ADMIN)
export class LeaderboardAdminController {
  constructor(private readonly rebuildService: LeaderboardRebuildService) {}

  @Post('/rebuild')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Rebuild all leaderboard (full backfill)' })
  rebuildAll(@Res({ passthrough: true }) _: Response): { ok: boolean; message: string } {
    this.rebuildService
      .rebuildAll()
      .catch((err: Error) => console.error('[LeaderboardAdmin] rebuildAll failed:', err.message));

    return {
      ok: true,
      message: 'Leaderboard rebuild started. Monitor server logs for completion.',
    };
  }

  @Post('/rebuild/sport/:sportId')
  @ApiOperation({ summary: 'Rebuild a single sport leaderboard' })
  async rebuildSport(@Param('sportId') sportId: string) {
    const result = await this.rebuildService.rebuildSport(sportId);
    return { ok: true, ...result };
  }

  @Post('/rebuild/universal')
  @ApiOperation({ summary: 'Rebuild the universal leaderboard' })
  async rebuildUniversal() {
    const result = await this.rebuildService.rebuildUniversal();
    return { ok: true, ...result };
  }

  @Post('/rebuild/user/:userId')
  @ApiOperation({ summary: "Refresh a single user's rank across all leaderboards" })
  async rebuildUser(@Param('userId') userId: string) {
    await this.rebuildService.rebuildForUser(userId);
    return { ok: true, user_id: userId };
  }
}
