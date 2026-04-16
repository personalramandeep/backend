import { ERole } from '@app/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class SwitchActiveRoleDto {
  @ApiProperty({ enum: ERole })
  @IsEnum(ERole)
  role: ERole;
}
