import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EExperienceLevel, EPlayingStyle } from '@app/common';

export class UpdatePlayerSportProfileDto {
  @IsEnum(EExperienceLevel)
  @IsOptional()
  @ApiPropertyOptional({ enum: EExperienceLevel, example: EExperienceLevel.ADVANCED })
  experienceLevel?: EExperienceLevel;

  @IsEnum(EPlayingStyle)
  @IsOptional()
  @ApiPropertyOptional({ enum: EPlayingStyle, example: EPlayingStyle.AGGRESSIVE })
  playingStyle?: EPlayingStyle;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  @ApiPropertyOptional({ example: 'Win regional championship' })
  goals?: string;
}
