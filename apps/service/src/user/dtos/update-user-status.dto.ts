import { EUserAccountStatus } from '@app/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ enum: EUserAccountStatus })
  @IsEnum(EUserAccountStatus)
  status: EUserAccountStatus;
}
