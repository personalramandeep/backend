import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { IMongodbBaseDocument, MONGODB_BASE_SCHEMA_OPTIONS, MongodbBaseEntity } from '../base';
import { EPostMediaType, EPostStatus, EPostVisibility, EVideoType } from './post.types';

@Schema({ _id: false })
class PostStats {
  @Prop({ type: Number, default: 0 })
  views: number;

  @Prop({ type: Number, default: 0 })
  likes: number;

  @Prop({ type: Number, default: 0 })
  comments: number;

  @Prop({ type: Number, default: 0 })
  shares: number;

  @Prop({ type: Number, default: 0 })
  bookmarks: number;
}

class PostMedia {
  @Prop({ type: String, enum: EPostMediaType, required: true })
  type: EPostMediaType;

  @Prop({ type: String, required: true })
  url: string;

  @Prop() thumbnail?: string;
  @Prop() mimeType?: string;
  @Prop() width?: number;
  @Prop() height?: number;
  @Prop() duration?: number;
  @Prop() nsfwScore?: number;
}

@Schema({ _id: false })
class PostMetadata {
  @Prop({ type: String, enum: EVideoType })
  videoType?: EVideoType;

  @Prop({ type: String })
  gameType?: string;

  @Prop({ type: String })
  cameraView?: string;
}

@Schema({ collection: 'posts', ...MONGODB_BASE_SCHEMA_OPTIONS })
export class PostEntity extends MongodbBaseEntity {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  sportId: string;

  @Prop({ type: String, trim: true, required: false, maxlength: 140 })
  caption?: string;

  @Prop({ type: [PostMedia], required: true })
  media: PostMedia[];

  @Prop({ type: String, enum: EPostStatus, required: true })
  status: EPostStatus;

  @Prop({ type: String, enum: EPostVisibility, default: EPostVisibility.PUBLIC })
  visibility: EPostVisibility;

  @Prop({ type: () => PostStats })
  stats: PostStats;

  @Prop({ type: () => PostMetadata })
  metadata: PostMetadata;

  @Prop() scheduledAt?: Date;
  @Prop() publishedAt?: Date;
  @Prop() expiresAt?: Date;
  @Prop() archivedAt?: Date;

  /** Set on soft-delete; null / absent = active */
  @Prop() deletedAt?: Date;

  @Prop({ type: Number, default: 0 })
  analysisRetryCount: number;

  @Prop({ type: Number, default: 0 })
  insightsRetryCount: number;
}

export type PostDocument = HydratedDocument<PostEntity> & IMongodbBaseDocument;

export const PostSchema = SchemaFactory.createForClass(PostEntity);

PostSchema.index({ userId: 1, deletedAt: 1, createdAt: -1 });
PostSchema.index({ status: 1, updatedAt: 1 });
