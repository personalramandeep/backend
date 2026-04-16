import { MediaDocument, MediaEntity } from '@app/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, UpdateQuery } from 'mongoose';

export class MediaRepository {
  constructor(@InjectModel(MediaEntity.name) private readonly model: Model<MediaDocument>) {}

  create(data: Partial<MediaEntity>): Promise<MediaDocument> {
    const doc = new this.model(data);
    return doc.save();
  }

  findById(id: string): Promise<MediaDocument | null> {
    return this.model.findById(id).exec();
  }

  findOneAndUpdate(
    filter: QueryFilter<MediaDocument>,
    update: UpdateQuery<MediaDocument>,
    options: { returnDocument?: 'before' | 'after' } = {},
  ): Promise<MediaDocument | null> {
    return this.model.findOneAndUpdate(filter, update, options).exec();
  }

  updateMany(
    filter: QueryFilter<MediaDocument>,
    update: UpdateQuery<MediaDocument>,
  ): Promise<{ modifiedCount: number }> {
    return this.model.updateMany(filter, update).exec();
  }
}
