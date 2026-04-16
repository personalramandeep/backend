import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { IMongodbBaseDocument, MONGODB_BASE_SCHEMA_OPTIONS, MongodbBaseEntity } from '../base';
import { EStreakType } from './streak.types';

@Schema({ collection: 'streak_events', ...MONGODB_BASE_SCHEMA_OPTIONS })
export class StreakEventEntity extends MongodbBaseEntity {
  @Prop({ type: String, required: true })
  user_id: string;

  @Prop({ type: String, enum: EStreakType, required: true })
  streak_type: EStreakType;

  @Prop({ required: true })
  source_id: string;

  @Prop({ required: true })
  qualified_local_date: string;
}

export type StreakEventDocument = HydratedDocument<StreakEventEntity> & IMongodbBaseDocument;

export const StreakEventSchema = SchemaFactory.createForClass(StreakEventEntity);

StreakEventSchema.index({ user_id: 1, streak_type: 1, qualified_local_date: 1 }, { unique: true });
