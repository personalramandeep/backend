import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class GetAiCoachSessionHistoryDto {
  @IsInt()
  @IsPositive()
  @ApiPropertyOptional({ default: 20 })
  limit: number = 20;

  @IsInt()
  @ApiPropertyOptional()
  offset: number = 0;
}
