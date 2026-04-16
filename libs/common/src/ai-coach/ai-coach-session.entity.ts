import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'ai_coach_sessions' })
export class AiCoachSessionEntity {
  @Prop({ required: true })
  user_id: string;

  @Prop({ required: true })
  started_at: Date;

  @Prop({ required: true })
  last_activity_at: Date;

  @Prop({ default: 0 })
  message_count: number;
}

export type AiCoachSessionDocument = AiCoachSessionEntity & Document;

export const AiCoachSessionSchema = SchemaFactory.createForClass(AiCoachSessionEntity);

AiCoachSessionSchema.index({ user_id: 1 });
AiCoachSessionSchema.index({ last_activity_at: 1 });
