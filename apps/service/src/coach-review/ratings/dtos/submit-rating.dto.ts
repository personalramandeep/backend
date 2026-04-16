import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const RATING_TAGS = [
  'Footwork',
  'Technique',
  'Defense',
  'Smash',
  'Serve',
  'Strategy',
  'Fitness',
  'Mental Game',
] as const;

export type RatingTag = (typeof RATING_TAGS)[number];

export class SubmitRatingDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty()
  review_request_id: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @ApiProperty({ description: 'Rating from 1 (worst) to 5 (best)', minimum: 1, maximum: 5 })
  rating: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  @ApiPropertyOptional({ description: 'Optional written review (max 1000 chars)', maxLength: 1000 })
  review_text?: string;

  @IsArray()
  @IsEnum(RATING_TAGS, { each: true })
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Optional topic tags (max 3)',
    enum: RATING_TAGS,
    isArray: true,
  })
  tags?: RatingTag[];
}
