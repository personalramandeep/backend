import { Injectable } from '@nestjs/common';
import { ImprovementResultDto, ImprovementWindow } from '../dtos/improvement-result.dto';

@Injectable()
export class PlayerMetricsService {
  /**
   * Computes the percentage improvement between a current and baseline value.
   * Returns 0 when there is insufficient data (null values or zero baseline).
   */
  computeImprovementPct(current: number | null, baseline: number | null): number {
    if (current === null || baseline === null || baseline === 0) return 0;
    return Math.round(((current - baseline) / baseline) * 100);
  }

  /**
   * Builds an ImprovementResultDto for a given measurement window.
   *
   * - 'overall'  → current_avg = cumulative avg; baseline = first video score
   * - 'monthly'  → current_avg = avg(score) this calendar month; baseline = last month
   * - 'weekly'   → avg this week vs last week
   * - 'daily'    → avg today vs yesterday
   * - 'yearly'   → avg this year vs last year
   */
  buildResult(
    window: ImprovementWindow,
    current: number | null,
    baseline: number | null,
  ): ImprovementResultDto {
    const pct = this.computeImprovementPct(current, baseline);
    const has_data = current !== null && baseline !== null && baseline !== 0;
    return { window, current_avg: current, baseline, pct, has_data };
  }
}
