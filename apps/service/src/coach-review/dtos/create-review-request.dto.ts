import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateReviewRequestDto {
  @IsMongoId()
  @IsNotEmpty()
  @ApiProperty({ description: 'MongoDB ObjectId of the post (video)' })
  post_id: string;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ description: 'UUID of the coach who will review' })
  coach_user_id: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @ApiPropertyOptional({ description: 'Optional message to the coach', maxLength: 500 })
  player_message?: string;
}
