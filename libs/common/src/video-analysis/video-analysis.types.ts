export interface AiSkillBreakdown {
  footwork: string;
  defense: string;
  attack: string;
  endurance: string;
}

export interface AiSkillScore {
  footwork_score: number;
  endurance_score: number;
  smash_score: number;
  defence_score: number;
}

export interface AiInsightsPayload {
  ai_score: number;
  calories_per_set: number;
  summary: string;
  skill_score: AiSkillScore;
  skill_breakdown: AiSkillBreakdown;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  movement_analysis: string;
  ai_coach: string;
}

export interface EnginePayload {
  record_angle: string;
  total_frames: number;
  shot_frames: string[];
  heatmap_path: string | null;
  step_count: number;
  distance_travelled_m: number;
  duration: number;
  computed_score?: number;
  sport_metrics: Record<string, number>;
}

export type VideoAnalysisStatus = 'success' | 'failed';

export interface VideoAnalysisScoreContext {
  prev_avg_score: number | null;
  /** Delta: ai_score − prev_avg_score */
  vs_average: number | null;
}
