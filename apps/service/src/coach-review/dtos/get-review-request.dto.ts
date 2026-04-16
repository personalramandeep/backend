import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class GetReviewRequestDto {
  @IsMongoId()
  @IsOptional()
  @ApiPropertyOptional({ description: 'MongoDB ObjectId of the post (optional)' })
  post_id: string;
}
