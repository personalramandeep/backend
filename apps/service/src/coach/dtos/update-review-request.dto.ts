import { EReviewRequestStatus } from '@app/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateReviewRequestDto {
  @IsEnum(EReviewRequestStatus)
  @IsNotEmpty()
  @ApiProperty()
  status: EReviewRequestStatus;
}
