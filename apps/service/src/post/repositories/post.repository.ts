import { PostDocument, PostEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DateTime } from 'luxon';
import { Model } from 'mongoose';

const ACTIVE = { deletedAt: null } as const;

@Injectable()
export class PostRepository {
  constructor(@InjectModel(PostEntity.name) private readonly model: Model<PostDocument>) {}

  create(data: Partial<PostEntity>): Promise<PostDocument> {
    const doc = new this.model(data);
    return doc.save();
  }

  async findByUserIdPaginated(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: PostDocument[]; total: number }> {
    const skip = (page - 1) * pageSize;
    const filter = { userId, ...ACTIVE };

    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return { data, total };
  }

  findByUserId(userId: string): Promise<PostDocument[]> {
    return this.model
      .find({ userId, ...ACTIVE })
      .sort({ createdAt: -1 })
      .exec();
  }

  findById(id: string): Promise<PostDocument | null> {
    return this.model.findOne({ _id: id, ...ACTIVE }).exec();
  }

  findByIdIncludeDeleted(id: string): Promise<PostDocument | null> {
    return this.model.findById(id).exec();
  }

  countByUserId(userId: string): Promise<number> {
    return this.model.countDocuments({ userId, deletedAt: null }).exec();
  }

  softDelete(id: string, userId: string): Promise<PostDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: id, userId, ...ACTIVE },
        { $set: { deletedAt: DateTime.utc().toJSDate() } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async softDeleteAll(userId: string): Promise<number> {
    const result = await this.model
      .updateMany({ userId, ...ACTIVE }, { $set: { deletedAt: DateTime.utc().toJSDate() } })
      .exec();
    return result.modifiedCount;
  }

  getCreatedAtSince(userId: string, since: Date): Promise<{ createdAt: Date }[]> {
    return this.model
      .find({ userId, deletedAt: null, createdAt: { $gte: since } }, { createdAt: 1, _id: 0 })
      .lean()
      .exec() as Promise<{ createdAt: Date }[]>;
  }
}
