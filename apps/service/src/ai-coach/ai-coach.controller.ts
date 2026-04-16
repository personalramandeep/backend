import { ERole } from '@app/common';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import mongoose from 'mongoose';
import { UserId } from '../auth/decorators/user.decorator';
import { Roles } from '../authorization/decorators/roles.decorator';
import { AiCoachRepository } from './repositories/ai-coach.repository';
import { GetAiCoachSessionHistoryDto } from './dtos/get-ai-coach-session-history.dto';
import { GetAiCoachSessionMessagesDto } from './dtos/get-ai-coach-session-messages.dto';

@ApiTags('AI Coach')
@ApiBearerAuth()
@Controller('/ai-coach')
@Roles(ERole.PLAYER)
export class AiCoachController {
  constructor(private readonly repo: AiCoachRepository) {}

  @Get('/history')
  @ApiOperation({ summary: 'Get session history for the AI Coach' })
  async getHistory(@UserId() userId: string, @Query() query: GetAiCoachSessionHistoryDto) {
    const sessions = await this.repo.getSessions(userId, query.limit, query.offset);
    return { sessions };
  }

  @Get('/sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Get messages for a specific session' })
  async getSessionMessages(
    @Param('sessionId') sessionId: string,
    @Query() query: GetAiCoachSessionMessagesDto,
  ) {
    const messages = await this.repo.getMessages(
      new mongoose.Types.ObjectId(sessionId),
      query.limit,
      query.offset,
    );
    return { messages };
  }
}
