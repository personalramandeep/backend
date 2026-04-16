import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCoachProfileDto {
  @ApiPropertyOptional({ description: 'Coach bio' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Years of experience' })
  @IsOptional()
  @IsNumber()
  experience_years?: number;

  @ApiPropertyOptional({ description: 'Specialization' })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Hourly rate in INR' })
  @IsOptional()
  @IsNumber()
  hourly_rate?: number;

  @ApiPropertyOptional({ description: 'Is profile published on marketplace' })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}
