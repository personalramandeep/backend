import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export type RatingSort = 'recent' | 'top';

export class GetRatingsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Page size (1-50)', default: 20 })
  limit?: number = 20;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Keyset pagination cursor (base64-encoded)' })
  cursor?: string;

  @IsEnum(['recent', 'top'])
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Sort order: recent (default) or top',
    enum: ['recent', 'top'],
  })
  sort?: RatingSort = 'recent';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Filter by exact star rating (1-5)' })
  rating?: number;
}
