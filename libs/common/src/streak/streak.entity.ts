import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { IMongodbBaseDocument, MONGODB_BASE_SCHEMA_OPTIONS, MongodbBaseEntity } from '../base';
import { EStreakType } from './streak.types';

@Schema({ collection: 'streaks', ...MONGODB_BASE_SCHEMA_OPTIONS })
export class StreakEntity extends MongodbBaseEntity {
  @Prop({ type: String, required: true })
  user_id: string;

  @Prop({ type: String, enum: EStreakType, required: true })
  streak_type: EStreakType;

  @Prop({ default: 0 })
  current_count: number;

  @Prop({ default: 0 })
  longest_count: number;

  @Prop({ type: String, default: null })
  last_qualified_local_date: string | null;

  @Prop({ type: Date, default: null })
  last_event_at: Date | null;
}

export type StreakDocument = HydratedDocument<StreakEntity> & IMongodbBaseDocument;

export const StreakSchema = SchemaFactory.createForClass(StreakEntity);

StreakSchema.index({ user_id: 1, streak_type: 1 }, { unique: true });
