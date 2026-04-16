import { EReviewRequestStatus } from '@app/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class ListReviewRequestsDto {
  @IsEnum(EReviewRequestStatus)
  @IsOptional()
  @ApiPropertyOptional()
  status?: EReviewRequestStatus;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional()
  limit?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @ApiPropertyOptional()
  offset?: number;
}
