import { EStreakType, StreakEventEntity } from '@app/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export class StreakEventRepository {
  constructor(@InjectModel(StreakEventEntity.name) private readonly model: Model<StreakEventEntity>) {}

  findByUserAndType(userId: string, streakType: EStreakType): Promise<StreakEventEntity[]> {
    return this.model
      .find({
        user_id: userId,
        streak_type: streakType,
      })
      .sort({ created_at: -1 })
      .exec();
  }

  create(data: Partial<StreakEventEntity>): Promise<StreakEventEntity> {
    return this.model.create(data);
  }
}
