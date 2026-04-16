import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PlayerPerformanceEventRepository } from '../leaderboard/repositories/player-performance-event.repository';
import { PostRepository } from '../post/repositories/post.repository';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export interface ActivityHeatmapDto {
  /** Sparse array — only days with at least one upload. */
  days: { date: string; count: number }[];
  best_month: string | null;
}

export interface ScoreTrendDto {
  points: { date: string; score: number }[];
  average: number | null;
  highest: number | null;
  latest: number | null;
}

@Injectable()
export class PlayerAnalyticsService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly perfEventRepo: PlayerPerformanceEventRepository,
  ) {}

  async getActivityHeatmap(userId: string): Promise<ActivityHeatmapDto> {
    const now = DateTime.utc();
    const since = now.startOf('year').toJSDate();

    const posts = await this.postRepository.getCreatedAtSince(userId, since);

    if (posts.length === 0) {
      return { days: [], best_month: null };
    }

    // Group by YYYY-MM-DD
    const countByDate = new Map<string, number>();
    const countByMonth = new Array<number>(12).fill(0);

    for (const { createdAt } of posts) {
      const dt = DateTime.fromJSDate(createdAt, { zone: 'utc' });
      const dateKey = dt.toISODate()!; // YYYY-MM-DD
      countByDate.set(dateKey, (countByDate.get(dateKey) ?? 0) + 1);
      countByMonth[dt.month - 1] += 1;
    }

    const days = Array.from(countByDate.entries()).map(([date, count]) => ({ date, count }));

    // Best month: highest upload count in the current year
    const maxMonthCount = Math.max(...countByMonth);
    const bestMonthIndex = maxMonthCount > 0 ? countByMonth.indexOf(maxMonthCount) : -1;
    const best_month = bestMonthIndex >= 0 ? MONTH_NAMES[bestMonthIndex] : null;

    return { days, best_month };
  }

  async getScoreTrend(userId: string): Promise<ScoreTrendDto> {
    const events = await this.perfEventRepo.findAppliedByUser(userId);

    if (events.length === 0) {
      return { points: [], average: null, highest: null, latest: null };
    }

    const points = events.map(({ score, created_at }) => ({
      date: DateTime.fromJSDate(created_at, { zone: 'utc' }).toISODate()!,
      score: Math.round(score * 10) / 10,
    }));

    const scores = points.map((p) => p.score);
    const average = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    const highest = Math.max(...scores);
    const latest = scores[scores.length - 1];

    return { points, average, highest, latest };
  }
}
