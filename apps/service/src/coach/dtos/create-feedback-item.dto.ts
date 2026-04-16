import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class DrillItemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  video_url?: string;
}

export class CreateFeedbackItemDto {
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional()
  video_timestamp_seconds?: number;

  @IsString()
  @MinLength(1)
  @ApiProperty()
  comment: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional()
  tags?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DrillItemDto)
  @IsOptional()
  @ApiPropertyOptional()
  drills?: DrillItemDto[];
}
