import { ERole } from '@app/common';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserId } from '../auth/decorators/user.decorator';
import { Roles } from '../authorization/decorators/roles.decorator';
import { CoachReviewService } from './coach-review.service';
import { CreateReviewRequestDto } from './dtos/create-review-request.dto';
import { GetReviewRequestDto } from './dtos/get-review-request.dto';

@ApiTags('Coach Reviews')
@ApiBearerAuth()
@Roles(ERole.PLAYER, ERole.PARENT, ERole.COACH)
@Controller('/coach-reviews')
export class CoachReviewController {
  constructor(private readonly coachReviewService: CoachReviewService) {}

  @Get('/available-coaches')
  @ApiOperation({ summary: 'Get available coaches for review' })
  async getAvailableCoaches() {
    // TODO: filter out coaches that the user is not subscribed to or has already requested a review for
    return this.coachReviewService.getAvailableCoaches();
  }

  @Post('/')
  @ApiOperation({ summary: 'Submit a video for coach review' })
  async createReviewRequest(@UserId() userId: string, @Body() body: CreateReviewRequestDto) {
    return this.coachReviewService.createReviewRequest(userId, body);
  }

  @Get('/me')
  @ApiOperation({ summary: 'Get my submitted review requests' })
  async getMyRequests(@UserId() userId: string, @Query() query: GetReviewRequestDto) {
    const requests = await this.coachReviewService.getMyRequests(userId, query.post_id);
    return requests.map((r) => ({
      id: r.id,
      status: r.status,
      post_id: r.post_id,
      coach_user_id: r.coach_user_id,
      coach_name: r.coach?.full_name || r.coach?.username,
      created_at: r.created_at,
    }));
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Cancel a pending review request' })
  async cancelRequest(@UserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.coachReviewService.cancelRequest(userId, id);
    return { success: true };
  }
}
