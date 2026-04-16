import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdatePlayerProfileDto {
  @IsNumber()
  @Min(100)
  @Max(250)
  @IsOptional()
  @ApiPropertyOptional({ example: 175, description: 'Height in cm (100-250)' })
  height_cm?: number;

  @IsNumber()
  @Min(30)
  @Max(200)
  @IsOptional()
  @ApiPropertyOptional({ example: 70, description: 'Weight in kg (30-200)' })
  weight_kg?: number;

  @IsString()
  @IsIn(['right', 'left'])
  @IsOptional()
  @ApiPropertyOptional({ example: 'right', description: 'Dominant hand (right or left)' })
  handedness?: 'right' | 'left';
}
