export enum EExperienceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  PROFESSIONAL = 'professional',
}

export enum EPlayingStyle {
  AGGRESSIVE = 'aggressive',
  DEFENSIVE = 'defensive',
  BALANCED = 'balanced',
  ALL_ROUNDER = 'all-rounder',
}

export interface SportPostOption {
  value: string;
  label: string;
  enabled: boolean;
}

export interface SportPostOptions {
  gameTypes: SportPostOption[];
  cameraViews: SportPostOption[];
}
