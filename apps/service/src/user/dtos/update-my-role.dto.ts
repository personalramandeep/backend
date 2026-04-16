import { ERole } from '@app/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateMyRoleDto {
  @ApiProperty({ enum: ERole })
  @IsEnum(ERole)
  role: ERole;
}
