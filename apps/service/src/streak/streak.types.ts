export interface IUploadStreakSummary {
  currentStreak: number;
  longestStreak: number;
  lastQualifiedDate: string | null;
  didCountToday: boolean;
  timezoneUsed: string;
}
