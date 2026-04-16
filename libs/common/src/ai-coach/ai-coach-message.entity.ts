import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { EAiCoachMessageRole } from './ai-coach.types';

@Schema({ collection: 'ai_coach_messages' })
export class AiCoachMessageEntity {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'ai_coach_sessions' })
  session_id: mongoose.Types.ObjectId;

  @Prop({ required: true })
  user_id: string;

  @Prop({ type: String, enum: EAiCoachMessageRole, required: true })
  role: EAiCoachMessageRole;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  created_at: Date;
}

export type AiCoachMessageDocument = AiCoachMessageEntity & Document;

export const AiCoachMessageSchema = SchemaFactory.createForClass(AiCoachMessageEntity);

AiCoachMessageSchema.index({ session_id: 1 });
AiCoachMessageSchema.index({ user_id: 1 });
AiCoachMessageSchema.index({ created_at: 1 });
