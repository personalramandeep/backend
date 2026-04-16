import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListCoachesDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Full text search query' })
  query?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Filter by specialization' })
  specialization?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Filter by location' })
  location?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Pagination limit', default: 20 })
  limit?: number = 20;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Pagination offset', default: 0 })
  offset?: number = 0;
}
