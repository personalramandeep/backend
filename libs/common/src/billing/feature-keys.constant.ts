export const FEATURE_KEYS = {
  VIDEO_ANALYSES: 'video_analyses',
  AI_COACH: 'ai_coach',
  ADVANCED_METRICS: 'advanced_metrics',
  HEATMAPS: 'heatmaps',
  CREATE_CHALLENGE: 'create_challenge',
  COACH_MESSAGING: 'coach_messaging',
  ATHLETE_BADGE: 'athlete_badge',
  LEADERBOARD_ACCESS: 'leaderboard_access',
  AI_TRAINING_PLANS: 'ai_training_plans',
} as const;

export type TFeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];
