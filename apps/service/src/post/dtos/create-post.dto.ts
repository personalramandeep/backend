import { EPostVisibility, EVideoType } from '@app/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { IsIanaTimezone } from '../../utils/validators/timezone.validator';

export class CreatePostDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  caption?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  mediaId: string;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty()
  sportId: string;

  @IsEnum(EPostVisibility)
  @IsNotEmpty()
  @ApiProperty({ enum: EPostVisibility, default: EPostVisibility.PUBLIC })
  visibility: EPostVisibility;

  @IsOptional()
  @IsString()
  @IsIanaTimezone({ message: 'timezone must be a valid IANA timezone' })
  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  timezone?: string;

  @IsEnum(EVideoType)
  @IsOptional()
  @ApiPropertyOptional({ enum: EVideoType })
  videoType?: EVideoType;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'singles' })
  gameType?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'baseline' })
  cameraView?: string;
}
