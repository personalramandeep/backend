import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class LeaderboardQueryDto {
  @IsOptional()
  @IsUUID()
  sport_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  // window and scope params reserved for future seasonal/weekly and geo-scoping support
}

export class AroundMeQueryDto {
  @IsOptional()
  @IsUUID()
  sport_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  radius?: number = 3;
}
