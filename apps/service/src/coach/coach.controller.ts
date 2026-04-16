import { ERole } from '@app/common';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserId, UserRole } from '../auth/decorators/user.decorator';
import { Roles } from '../authorization/decorators/roles.decorator';
import { CreateFeedbackItemDto } from './dtos/create-feedback-item.dto';
import { ListCoachesDto } from './dtos/list-coaches.dto';
import { ListReviewRequestsDto } from './dtos/list-review-requests.dto';
import { UpdateCoachProfileDto } from './dtos/update-coach-profile.dto';
import { UpdateReviewRequestDto } from './dtos/update-review-request.dto';
import { CoachInboxService } from './services/coach-inbox.service';
import { CoachService } from './services/coach.service';

@ApiTags('Coaches')
@ApiBearerAuth()
@Controller('/coaches')
@Roles(ERole.COACH)
export class CoachController {
  constructor(
    private readonly coachService: CoachService,
    private readonly coachInboxService: CoachInboxService,
  ) {}

  @Get('/me/review-requests')
  @ApiOperation({ summary: 'List assigned review requests' })
  async getMyReviewRequests(@UserId() userId: string, @Query() query: ListReviewRequestsDto) {
    return this.coachInboxService.getCoachRequests(userId, query);
  }

  @Get('/me/review-requests/:id')
  @ApiOperation({ summary: 'Get a specific review request' })
  async getReviewRequestById(@UserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.coachInboxService.getCoachRequestById(userId, id);
  }

  @Patch('/me/review-requests/:id')
  @ApiOperation({ summary: 'Update status of a review request' })
  async updateReviewRequest(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateReviewRequestDto,
  ) {
    return this.coachInboxService.updateReviewRequest(userId, id, body);
  }

  @Post('/me/review-requests/:id/feedback')
  @ApiOperation({ summary: 'Add a feedback item to a review request' })
  async addFeedbackItem(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateFeedbackItemDto,
  ) {
    return this.coachInboxService.addFeedbackItem(userId, id, body);
  }

  @Delete('/me/review-requests/:id/feedback/:itemId')
  @ApiOperation({ summary: 'Delete a feedback item' })
  async deleteFeedbackItem(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.coachInboxService.deleteFeedbackItem(userId, id, itemId);
  }

  @Post('/me/review-requests/:id/feedback/:itemId/annotation')
  @ApiOperation({ summary: 'Upload an annotation drawing to a feedback item' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async uploadAnnotation(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.coachInboxService.uploadAnnotation(userId, id, itemId, file);
  }

  @Get('/me')
  @ApiOperation({ summary: 'Get the current users coach profile' })
  async getMyCoachProfile(@UserId() userId: string) {
    return this.coachService.getMyCoachProfile(userId);
  }

  @Get('/')
  @Roles(ERole.PLAYER, ERole.PARENT, ERole.COACH, ERole.ADMIN)
  @ApiOperation({ summary: 'List published coaches with FTS' })
  async listCoaches(
    @UserId() userId: string,
    @UserRole() role: ERole,
    @Query() query: ListCoachesDto,
  ) {
    const viewerUserId = role === ERole.PLAYER ? userId : undefined;
    return this.coachService.listCoaches(query, viewerUserId);
  }

  @Patch('/me')
  @ApiOperation({ summary: 'Update your coach profile' })
  async updateMyCoachProfile(@UserId() userId: string, @Body() body: UpdateCoachProfileDto) {
    const data = await this.coachService.updateMyCoachProfile(userId, body);
    return { success: true, data };
  }

  @Get('/:userId')
  @Roles(ERole.PLAYER, ERole.PARENT, ERole.COACH, ERole.ADMIN)
  @ApiOperation({ summary: 'Get coach profile by user ID' })
  async getCoachProfileById(
    @UserId() viewerUserId: string,
    @UserRole() role: ERole,
    @Param('userId') targetUserId: string,
  ) {
    const viewer = role === ERole.PLAYER ? viewerUserId : undefined;
    return this.coachService.getPublicCoachProfile(targetUserId, viewer);
  }
}
