import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class GetAiCoachSessionMessagesDto {
  @IsInt()
  @IsPositive()
  @ApiPropertyOptional({ default: 50 })
  limit: number = 50;

  @IsInt()
  @ApiPropertyOptional()
  offset: number = 0;
}
