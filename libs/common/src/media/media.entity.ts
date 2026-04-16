import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { IMongodbBaseDocument, MONGODB_BASE_SCHEMA_OPTIONS, MongodbBaseEntity } from '../base';
import { EMediaStatus } from './media.types';

@Schema({ collection: 'media', ...MONGODB_BASE_SCHEMA_OPTIONS })
export class MediaEntity extends MongodbBaseEntity {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  objectKey: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  extension: string;

  @Prop({ required: true })
  size: number;

  @Prop({ type: String, enum: EMediaStatus, default: EMediaStatus.PENDING })
  status: EMediaStatus;

  @Prop()
  gcsGeneration: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'posts' })
  linkedPostId?: Types.ObjectId;
}

export type MediaDocument = HydratedDocument<MediaEntity> & IMongodbBaseDocument;

export const MediaSchema = SchemaFactory.createForClass(MediaEntity);

MediaSchema.index({ userId: 1 });
MediaSchema.index({ userId: 1, status: 1 });
MediaSchema.index({ linkedPostId: 1 }, { sparse: true });
