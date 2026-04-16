export enum EReviewRequestStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export type DrillDto = {
  title: string;
  description: string;
  video_url?: string;
};
