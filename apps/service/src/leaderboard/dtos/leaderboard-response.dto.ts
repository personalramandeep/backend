export class LeaderboardEntryDto {
  rank: number;
  prev_rank: number | null;
  rank_delta: number | null;
  user_id: string;
  username: string;
  full_name: string;
  profile_pic_url: string | null;
  avg_score: number;
  score_delta: number;
  video_count: number;
  is_me: boolean;
}

export class LeaderboardResponseDto {
  data: LeaderboardEntryDto[];
  total: number;
  sport_id: string | null;
  scope: string;
  window: string;
  generated_at: string;
}

export class MyRankResponseDto {
  rank: number | null;
  prev_rank: number | null;
  rank_delta: number | null;
  avg_score: number;
  score_delta: number;
  video_count: number;
  /** Percentage of players this user ranks above. Null if not on leaderboard. */
  percentile: number | null;
  total_players: number;
}

export class AroundMeResponseDto {
  entries: LeaderboardEntryDto[];
  my_rank: number | null;
  total_players: number;
}

export class LeaderboardWidgetResponseDto {
  entries: LeaderboardEntryDto[];
  my_rank: number | null;
  my_avg_score: number | null;
  total_players: number;
  sport_id: string | null;
  scope: string;
  /** Seconds since underlying data was last updated (from cache TTL). */
  cache_age_seconds: number;
}
