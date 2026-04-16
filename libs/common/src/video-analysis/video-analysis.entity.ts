import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { IMongodbBaseDocument, MONGODB_BASE_SCHEMA_OPTIONS, MongodbBaseEntity } from '../base';
import {
  AiInsightsPayload,
  EnginePayload,
  VideoAnalysisScoreContext,
  VideoAnalysisStatus,
} from './video-analysis.types';

@Schema({ collection: 'video_analyses', ...MONGODB_BASE_SCHEMA_OPTIONS })
export class VideoAnalysisEntity extends MongodbBaseEntity {
  @Prop({ type: String, required: true })
  post_id: string;

  @Prop({ type: String, required: true })
  user_id: string;

  @Prop({ type: String, required: true })
  sport_id: string;

  @Prop({ type: Number, required: false })
  computed_score?: number;

  @Prop({ type: String, enum: ['success', 'failed'], required: true })
  status: VideoAnalysisStatus;

  @Prop({ type: Object, default: null })
  error_payload: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  engine_payload: EnginePayload | null;

  @Prop({ type: Object, default: null })
  ai_insights: AiInsightsPayload | null;

  @Prop({ type: Date, default: null })
  ai_insights_generated_at: Date | null;

  @Prop({ type: Object, default: null })
  score_context: VideoAnalysisScoreContext | null;
}

export type VideoAnalysisDocument = HydratedDocument<VideoAnalysisEntity> & IMongodbBaseDocument;

export const VideoAnalysisSchema = SchemaFactory.createForClass(VideoAnalysisEntity);

VideoAnalysisSchema.index({ post_id: 1 }, { unique: true });
VideoAnalysisSchema.index({ user_id: 1, createdAt: -1 });
VideoAnalysisSchema.index({ sport_id: 1, computed_score: -1 });
