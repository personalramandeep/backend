import { IsNumber, IsObject, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RecordPerformanceScoreDto {
  @IsUUID()
  sport_id: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  score: number;

  /** Per-skill scores. Keys must match sport_metrics.key.
   *  E.g. { footwork: 92, defense: 72, net_play: 97, smash: 86, endurance: 87 } */
  @IsOptional()
  @IsObject()
  skill_scores?: Record<string, number>;
}
