import { EUserGender } from '@app/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, MaxLength, Matches } from 'class-validator';
import { IsIanaTimezone } from '../../utils/validators/timezone.validator';

export class UpdateUserProfileDto {
  @IsString()
  @MaxLength(50)
  @IsOptional()
  @ApiPropertyOptional({ example: 'John Doe', maxLength: 50 })
  full_name?: string;

  @IsEnum(EUserGender)
  @IsOptional()
  @ApiPropertyOptional({ enum: EUserGender })
  gender?: EUserGender;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  @ApiPropertyOptional({ example: '1990-01-01', description: 'Date of birth' })
  dob?: Date;

  @IsString()
  @MaxLength(30)
  @IsOptional()
  @ApiPropertyOptional({ example: 'Hello there', maxLength: 30 })
  bio?: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain alphanumeric characters and underscores' })
  @MaxLength(25)
  @IsOptional()
  @ApiPropertyOptional({ example: 'john_doe', maxLength: 25 })
  username?: string;

  @IsString()
  @IsIanaTimezone({ message: 'timezone must be a valid IANA timezone' })
  @IsOptional()
  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  timezone?: string;
}
