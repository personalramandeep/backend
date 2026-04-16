import { ERole } from '@app/common';
import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserId } from '../auth/decorators/user.decorator';
import { Roles } from '../authorization/decorators/roles.decorator';
import { InitiateMediaUploadDto } from './dtos/initiate-media-upload.dto';
import { MediaService } from './media.service';

@ApiTags('Media')
@Controller('/media')
@Roles(ERole.PLAYER, ERole.PARENT, ERole.COACH, ERole.ADMIN)
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('/initiate')
  @ApiOperation({ summary: 'Initiate media upload' })
  initiateUpload(@UserId() userId: string, @Body() body: InitiateMediaUploadDto) {
    return this.mediaService.initiateUpload(userId, body.filename, body.mimeType);
  }

  @Post('/:id/complete')
  @ApiOperation({ summary: 'Complete media upload' })
  completeUpload(@Param('id') id: string) {
    return this.mediaService.completeUpload(id);
  }
}
