import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SportMetricInputDto {
  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional()
  id?: string;

  @IsString()
  @MaxLength(100)
  @ApiProperty()
  name: string;

  @IsString()
  @MaxLength(100)
  @ApiProperty()
  key: string;

  @IsNumber()
  @ApiProperty({ default: 1 })
  weight: number;
}
