import { ERole } from '@app/common';
import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserId } from '../auth/decorators/user.decorator';
import { Roles } from '../authorization/decorators/roles.decorator';
import { CreateSportDto } from './dtos/create-sport.dto';
import { UpdateMySportsDto } from './dtos/update-my-sports.dto';
import { UpdatePlayerSportProfileDto } from './dtos/update-player-sport-profile.dto';
import { UpdateSportDto } from './dtos/update-sport.dto';
import { SportService } from './sport.service';

@ApiTags('Sports')
@Controller('/sports')
export class SportController {
  constructor(private readonly sportService: SportService) {}

  @Get('/')
  @ApiOperation({ summary: 'List active sports' })
  listSports() {
    return this.sportService.listActiveSports();
  }

  @Get('/all')
  @ApiBearerAuth()
  @ApiTags('Admin')
  @ApiOperation({ summary: 'List all sports (ADMIN)' })
  @Roles(ERole.ADMIN)
  listAllSports() {
    return this.sportService.listAllSports();
  }

  @Get('/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List the current player sports' })
  @Roles(ERole.PLAYER, ERole.COACH)
  getMySports(@UserId() userId: string) {
    return this.sportService.getPlayerSports(userId);
  }

  @Put('/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace the current player sports' })
  @Roles(ERole.PLAYER)
  updateMySports(@UserId() userId: string, @Body() body: UpdateMySportsDto) {
    return this.sportService.replacePlayerSports(userId, body.sportIds);
  }

  @Patch('/me/:sportId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update player profile for a specific sport' })
  @Roles(ERole.PLAYER)
  updatePlayerSportProfile(
    @UserId() userId: string,
    @Param('sportId') sportId: string,
    @Body() body: UpdatePlayerSportProfileDto,
  ) {
    return this.sportService.updatePlayerSportProfile(userId, sportId, body);
  }

  @Post('/')
  @ApiBearerAuth()
  @ApiTags('Admin')
  @ApiOperation({ summary: 'Create a sport (ADMIN)' })
  @Roles(ERole.ADMIN)
  createSport(@Body() body: CreateSportDto) {
    return this.sportService.createSport(body);
  }

  @Patch('/:sportId')
  @ApiBearerAuth()
  @ApiTags('Admin')
  @ApiOperation({ summary: 'Update a sport (ADMIN)' })
  @Roles(ERole.ADMIN)
  updateSport(@Param('sportId') sportId: string, @Body() body: UpdateSportDto) {
    return this.sportService.updateSport(sportId, body);
  }

  @Post('/:sportId/activate')
  @ApiBearerAuth()
  @ApiTags('Admin')
  @ApiOperation({ summary: 'Activate a sport (ADMIN)' })
  @Roles(ERole.ADMIN)
  activateSport(@Param('sportId') sportId: string) {
    return this.sportService.setSportActiveState(sportId, true);
  }

  @Post('/:sportId/deactivate')
  @ApiBearerAuth()
  @ApiTags('Admin')
  @ApiOperation({ summary: 'Deactivate a sport (ADMIN)' })
  @Roles(ERole.ADMIN)
  deactivateSport(@Param('sportId') sportId: string) {
    return this.sportService.setSportActiveState(sportId, false);
  }

  @Get('/:sportIdOrSlug')
  @ApiOperation({ summary: 'Get an active sport by id or slug' })
  getSport(@Param('sportIdOrSlug') sportIdOrSlug: string) {
    return this.sportService.getActiveSport(sportIdOrSlug);
  }
}
