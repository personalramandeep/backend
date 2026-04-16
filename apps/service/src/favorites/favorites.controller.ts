import { ERole } from '@app/common';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserId } from '../auth/decorators/user.decorator';
import { Roles } from '../authorization/decorators/roles.decorator';
import { ListFavoriteDto } from './dtos/list-favorite.dto';
import { ToggleFavoriteDto } from './dtos/toggle-favorite.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('Favorites')
@ApiBearerAuth()
@Controller('/favorites')
@Roles(ERole.PLAYER)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post('/')
  @ApiOperation({ summary: 'Toggle a favorite (coach or post)' })
  async toggle(@UserId() userId: string, @Body() body: ToggleFavoriteDto) {
    return this.favoritesService.toggle(userId, body.target_type, body.target_id);
  }

  @Get('/')
  @ApiOperation({ summary: 'List favorites by type (coach | post) with pagination' })
  async list(@UserId() userId: string, @Query() query: ListFavoriteDto) {
    const { ids, total } = await this.favoritesService.listByType(
      userId,
      query.type,
      query.limit,
      query.offset,
    );

    return {
      type: query.type,
      ids,
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
