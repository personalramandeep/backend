import { FavoriteTargetType } from '@app/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class ToggleFavoriteDto {
  @ApiProperty({ enum: FavoriteTargetType })
  @IsEnum(FavoriteTargetType)
  target_type: FavoriteTargetType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  target_id: string;
}
