import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Internal } from '../auth/decorators/internal.decorator';
import { InternalHmacGuard } from '../auth/guards/internal-hmac.guard';
import { VideoAnalysisFailureDto } from './dtos/video-analysis-failure.dto';
import { VideoAnalysisResultDto } from './dtos/video-analysis-result.dto';
import { VideoAnalysisService } from './services/video-analysis.service';

@ApiExcludeController()
@Controller('/internal')
@Internal()
@UseGuards(InternalHmacGuard)
export class VideoAnalysisController {
  constructor(private readonly videoAnalysisService: VideoAnalysisService) {}

  @Post('/posts/:postId/analysis-result')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleResult(@Param('postId') postId: string, @Body() dto: VideoAnalysisResultDto) {
    return this.videoAnalysisService.handleResult(postId, dto);
  }

  @Post('/posts/:postId/analysis-failure')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleFailure(@Param('postId') postId: string, @Body() dto: VideoAnalysisFailureDto) {
    await this.videoAnalysisService.handleFailure(postId, dto.error);
    return { accepted: true };
  }
}
