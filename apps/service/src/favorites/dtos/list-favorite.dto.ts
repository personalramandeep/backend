import { FavoriteTargetType } from '@app/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class ListFavoriteDto {
  @ApiProperty({ enum: FavoriteTargetType })
  @IsEnum(FavoriteTargetType)
  @IsNotEmpty()
  type: FavoriteTargetType;

  @ApiPropertyOptional({ default: 50 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 50;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset: number = 0;
}
