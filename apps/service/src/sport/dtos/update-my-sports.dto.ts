import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class UpdateMySportsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @ApiProperty({ type: [String] })
  sportIds: string[];
}
