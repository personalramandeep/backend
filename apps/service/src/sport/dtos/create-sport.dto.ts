import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { SportMetricInputDto } from './sport-metric-input.dto';

export class SportPostOptionDto {
  @IsString()
  @ApiProperty()
  value: string;

  @IsString()
  @ApiProperty()
  label: string;

  @IsBoolean()
  @ApiProperty()
  enabled: boolean;
}

export class SportPostOptionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SportPostOptionDto)
  @ApiProperty({ type: [SportPostOptionDto] })
  gameTypes: SportPostOptionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SportPostOptionDto)
  @ApiProperty({ type: [SportPostOptionDto] })
  cameraViews: SportPostOptionDto[];
}

export class CreateSportDto {
  @IsString()
  @MaxLength(50)
  @ApiProperty()
  name: string;

  @IsString()
  @MaxLength(50)
  @ApiProperty()
  slug: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ default: true })
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SportMetricInputDto)
  @ArrayMaxSize(50)
  @IsOptional()
  @ApiPropertyOptional({ type: [SportMetricInputDto] })
  metrics?: SportMetricInputDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SportPostOptionsDto)
  @ApiPropertyOptional({ type: SportPostOptionsDto })
  postOptions?: SportPostOptionsDto;
}
