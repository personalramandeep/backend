export enum EPostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  ANALYSING = 'analysing', // dispatched to AI engine, awaiting callback
  ANALYSIS_FAILED = 'analysis_failed', // AI engine returned error or timed out
  GENERATING_INSIGHTS = 'generating_insights', // AI engine callback received, LLM insights running
  INSIGHTS_FAILED = 'insights_failed', // LLM failed to generate insights, eligible for retry
  FAILED = 'failed',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
}

export enum EPostVisibility {
  PUBLIC = 'public',
  FOLLOWERS = 'followers',
  PRIVATE = 'private',
}

export enum EPostMediaType {
  // IMAGE = 'image',
  VIDEO = 'video',
}

export enum EVideoType {
  MATCH = 'match',
  PRACTICE = 'practice',
  DRILL = 'drill',
}
