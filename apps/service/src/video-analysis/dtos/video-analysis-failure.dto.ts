import { IsObject } from 'class-validator';

export class VideoAnalysisFailureDto {
  @IsObject()
  error: Record<string, unknown>;
}
