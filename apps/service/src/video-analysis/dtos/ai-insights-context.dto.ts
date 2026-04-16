export interface AiInsightsMetrics {
  step_count: number;
  distance_travelled_m: number;
  sport_metrics: Record<string, unknown>;
  total_frames: number;
  clip_duration_sec: number;
  record_angle: string;
}

export interface AiInsightsPlayerProfile {
  weight_kg: number;
  height_m: number;
  skill_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
}

export interface AiInsightsContext {
  postId: string;
  metrics: AiInsightsMetrics;
  playerProfile: AiInsightsPlayerProfile;
  heatmapBuffer: Buffer | null;
  shotFrameBuffers: Buffer[];
}
