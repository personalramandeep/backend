import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class UpdateProfilePicDto {
  @IsMongoId()
  @IsNotEmpty()
  @ApiProperty({ description: 'The new profile picture Media ID' })
  mediaId: string;
}
