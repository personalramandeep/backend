import { ERole, FEATURE_KEYS } from '@app/common';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserId } from '../auth/decorators/user.decorator';
import { Roles } from '../authorization/decorators/roles.decorator';
import { CheckEntitlement } from '../entitlements/decorators/check-entitlement.decorator';
import { EntitlementGuard } from '../entitlements/guards/entitlement.guard';
import { CreatePostDto } from './dtos/create-post.dto';
import { GetMyPostsQueryDto } from './dtos/get-my-posts-query.dto';
import { PostService } from './post.service';

@ApiTags('Posts')
@ApiBearerAuth()
@Controller('/posts')
@Roles(ERole.PLAYER, ERole.PARENT, ERole.COACH, ERole.ADMIN)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post('/')
  @Roles(ERole.PLAYER, ERole.COACH)
  @UseGuards(EntitlementGuard)
  @CheckEntitlement(FEATURE_KEYS.VIDEO_ANALYSES)
  @ApiOperation({ summary: 'Create a new post' })
  async create(@UserId() userId: string, @Body() body: CreatePostDto) {
    return this.postService.createPost(userId, body);
  }

  @Get('/me')
  @Roles(ERole.PLAYER, ERole.COACH)
  @ApiOperation({ summary: 'Get my posts (paginated)' })
  async getMyPosts(@UserId() userId: string, @Query() query: GetMyPostsQueryDto) {
    return this.postService.getMyPosts(userId, query.page, query.pageSize);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get a post by ID' })
  async getPostById(@Param('id') id: string) {
    return this.postService.getPostById(id);
  }

  @Get('/:id/analysis')
  @Roles(ERole.PLAYER, ERole.COACH)
  @ApiOperation({ summary: 'Get AI video analysis + LLM insights for a post' })
  async getAnalysis(@Param('id') id: string, @UserId() userId: string) {
    return this.postService.getAnalysis(id, userId);
  }

  @Delete('/me/all')
  @Roles(ERole.PLAYER)
  @ApiOperation({ summary: 'Soft-delete all posts for current user' })
  async deleteAllPosts(@UserId() userId: string) {
    return this.postService.deleteAllPosts(userId);
  }

  @Delete('/:id')
  @Roles(ERole.PLAYER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a post' })
  async deletePost(@UserId() userId: string, @Param('id') id: string): Promise<void> {
    return this.postService.deletePost(userId, id);
  }
}
