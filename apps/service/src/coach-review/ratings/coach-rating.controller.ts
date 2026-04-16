import { ERole } from '@app/common';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserId } from '../../auth/decorators/user.decorator';
import { Roles } from '../../authorization/decorators/roles.decorator';
import { CoachRatingService } from './coach-rating.service';
import { GetRatingsQueryDto } from './dtos/get-ratings-query.dto';
import { SubmitRatingDto } from './dtos/submit-rating.dto';

@ApiTags('Coach Ratings')
@ApiBearerAuth()
@Controller('/coach-ratings')
export class CoachRatingController {
  constructor(private readonly coachRatingService: CoachRatingService) {}

  @Post('/')
  @Roles(ERole.PLAYER)
  @ApiOperation({ summary: 'Submit a rating for a completed coach review session' })
  async submitRating(@UserId() userId: string, @Body() body: SubmitRatingDto) {
    const { rating, alreadyExisted } = await this.coachRatingService.submitRating(userId, body);

    if (alreadyExisted) {
      return {
        statusCode: HttpStatus.OK,
        message: 'Rating already submitted for this session',
        data: rating,
      };
    }

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Rating submitted successfully',
      data: rating,
    };
  }

  @Get('/my-review')
  @HttpCode(HttpStatus.OK)
  @Roles(ERole.PLAYER)
  @ApiOperation({
    summary: "Get the current player's own rating for a specific review request",
  })
  @ApiQuery({ name: 'review_request_id', required: true, type: String })
  async getMyRating(
    @UserId() userId: string,
    @Query('review_request_id', ParseUUIDPipe) reviewRequestId: string,
  ) {
    return this.coachRatingService.getMyRating(userId, reviewRequestId);
  }

  @Get('/:coachUserId')
  @HttpCode(HttpStatus.OK)
  @Roles(ERole.PLAYER, ERole.PARENT, ERole.COACH, ERole.ADMIN)
  @ApiOperation({ summary: 'List ratings for a coach' })
  async listRatings(
    @Param('coachUserId', ParseUUIDPipe) coachUserId: string,
    @Query() query: GetRatingsQueryDto,
  ) {
    return this.coachRatingService.listRatings(coachUserId, query);
  }

  @Get('/:coachUserId/summary')
  @HttpCode(HttpStatus.OK)
  @Roles(ERole.PLAYER, ERole.PARENT, ERole.COACH, ERole.ADMIN)
  @ApiOperation({ summary: 'Get rating summary for a coach (cached)' })
  async getRatingSummary(@Param('coachUserId', ParseUUIDPipe) coachUserId: string) {
    return this.coachRatingService.getRatingSummary(coachUserId);
  }
}
