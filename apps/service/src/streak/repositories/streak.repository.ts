import { EStreakType, StreakEntity } from '@app/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export class StreakRepository {
  constructor(@InjectModel(StreakEntity.name) private readonly model: Model<StreakEntity>) {}

  findByUserAndType(userId: string, streakType: EStreakType): Promise<StreakEntity | null> {
    return this.model
      .findOne({
        user_id: userId,
        streak_type: streakType,
      })
      .exec();
  }

  upsert(
    userId: string,
    streakType: EStreakType,
    updateData: Partial<StreakEntity>,
  ): Promise<StreakEntity> {
    return this.model
      .findOneAndUpdate(
        { user_id: userId, streak_type: streakType },
        {
          $set: updateData,
          $setOnInsert: { user_id: userId, streak_type: streakType },
        },
        { new: true, upsert: true },
      )
      .exec();
  }
}
