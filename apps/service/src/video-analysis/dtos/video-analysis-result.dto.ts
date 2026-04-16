import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class VideoAnalysisResultDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  record_angle: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @ApiProperty()
  total_frames: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ type: [String] })
  shot_frames?: string[];

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  heatmap_path?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @ApiProperty()
  step_count: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ApiProperty()
  distance_travelled_m: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  computed_score?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ApiProperty()
  duration: number;

  @IsObject()
  @IsOptional()
  @ApiPropertyOptional()
  sport_metrics?: Record<string, unknown>;
}
