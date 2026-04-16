import { ApiProperty } from '@nestjs/swagger';

export type ImprovementWindow = 'overall' | 'monthly' | 'weekly' | 'daily' | 'yearly';

export class ImprovementResultDto {
  @ApiProperty({ enum: ['overall', 'monthly', 'weekly', 'daily', 'yearly'] })
  window: ImprovementWindow;

  @ApiProperty({
    nullable: true,
    description: 'Cumulative avg for "overall"; period avg for time windows.',
  })
  current_avg: number | null;

  @ApiProperty({
    nullable: true,
    description: 'First video score for "overall"; previous period avg for time windows.',
  })
  baseline: number | null;

  @ApiProperty()
  pct: number;

  @ApiProperty({
    description: 'False when there is not enough data to produce a meaningful percentage.',
  })
  has_data: boolean;
}
