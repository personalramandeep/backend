import { EStreakType } from '@app/common';
import { Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import { UserService } from '../user/services/user.service';
import { TimezoneService } from '../utils/services/timezone.service';
import { StreakEventRepository } from './repositories/streak-event.repository';
import { StreakRepository } from './repositories/streak.repository';

@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(
    private readonly timezoneService: TimezoneService,
    private readonly streakRepository: StreakRepository,
    private readonly streakEventRepository: StreakEventRepository,
    private readonly userService: UserService,
  ) {}

  async recordEvent(userId: string, streakType: EStreakType, sourceId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const timezone = this.timezoneService.resolveTimezone(user.timezone);
    const nowLocal = DateTime.now().setZone(timezone);
    const qualifiedDate = nowLocal.toISODate(); // YYYY-MM-DD

    if (!qualifiedDate) {
      this.logger.error('Failed to resolve qualified date from local timezone');
      return;
    }

    try {
      await this.streakEventRepository.create({
        user_id: userId,
        streak_type: streakType,
        source_id: sourceId,
        qualified_local_date: qualifiedDate,
      });
    } catch (error: any) {
      if (error.code === 11000) {
        // Duplicate key error (event already recorded for this date)
        return;
      }
      throw error;
    }

    const streak = await this.streakRepository.findByUserAndType(userId, streakType);
    let current_count = 1;
    let longest_count = 1;

    if (streak && streak.last_qualified_local_date) {
      const lastDate = DateTime.fromISO(streak.last_qualified_local_date, { zone: timezone });
      const diffInDays = Math.floor(nowLocal.startOf('day').diff(lastDate.startOf('day'), 'days').days);

      if (diffInDays === 1) {
        current_count = streak.current_count + 1;
      } else if (diffInDays <= 0) {
        current_count = streak.current_count; // Defensive check
      }
      longest_count = Math.max(streak.longest_count, current_count);
    }

    await this.streakRepository.upsert(userId, streakType, {
      current_count,
      longest_count,
      last_qualified_local_date: qualifiedDate,
      last_event_at: new Date(),
    });
  }

  async getStreakSummary(userId: string, streakType: EStreakType = EStreakType.POST_UPLOAD) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const timezone = this.timezoneService.resolveTimezone(user.timezone);
    const streak = await this.streakRepository.findByUserAndType(userId, streakType);

    if (!streak) {
      return { current_count: 0, longest_count: 0, is_active: false };
    }

    const nowLocal = DateTime.now().setZone(timezone);
    let isActive = false;
    let currentCount = streak.current_count;

    if (streak.last_qualified_local_date) {
      const lastDate = DateTime.fromISO(streak.last_qualified_local_date, { zone: timezone });
      const diffInDays = Math.floor(nowLocal.startOf('day').diff(lastDate.startOf('day'), 'days').days);

      if (diffInDays <= 1) {
        isActive = true;
      } else {
        currentCount = 0; // Broken streak
      }
    }

    return {
      current_count: currentCount,
      longest_count: streak.longest_count,
      is_active: isActive,
    };
  }
}
