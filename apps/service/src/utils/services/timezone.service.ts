import { Injectable } from '@nestjs/common';
import { IANAZone } from 'luxon';
import { DEFAULT_TIMEZONE } from '../../constants';

@Injectable()
export class TimezoneService {
  isValidTimezone(timezone?: string | null): timezone is string {
    return Boolean(timezone && IANAZone.isValidZone(timezone));
  }

  resolveTimezone(storedTimezone?: string | null, browserTimezone?: string | null): string {
    if (this.isValidTimezone(storedTimezone)) {
      return storedTimezone;
    }

    if (this.isValidTimezone(browserTimezone)) {
      return browserTimezone;
    }

    return DEFAULT_TIMEZONE;
  }
}
