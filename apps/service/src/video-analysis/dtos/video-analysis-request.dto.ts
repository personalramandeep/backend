export type RecordAngle = 'backcourt' | 'frontcourt';

export const CAMERA_VIEW_TO_RECORD_ANGLE: Record<string, RecordAngle> = {
  baseline: 'backcourt',
  front_net: 'frontcourt',
  side: 'backcourt',
};

export interface VideoAnalysisRequest {
  postId: string;
  videoId: string;
  userId: string;
  filePath: string;
  recordAngle?: RecordAngle;
  videoType?: string;
  gameType?: string;
  callbackUrl?: string;
}
