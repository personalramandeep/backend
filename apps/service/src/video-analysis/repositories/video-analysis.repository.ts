import {
  AiInsightsPayload,
  VideoAnalysisDocument,
  VideoAnalysisEntity,
  VideoAnalysisScoreContext,
} from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DateTime } from 'luxon';
import { Model } from 'mongoose';

@Injectable()
export class VideoAnalysisRepository {
  constructor(
    @InjectModel(VideoAnalysisEntity.name)
    private readonly model: Model<VideoAnalysisDocument>,
  ) {}

  async upsert(data: Partial<VideoAnalysisEntity>): Promise<VideoAnalysisDocument> {
    const { post_id, user_id, sport_id, ...mutableFields } = data;

    return this.model
      .findOneAndUpdate(
        { post_id },
        {
          $set: mutableFields,
          $setOnInsert: { post_id, user_id, sport_id },
        },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();
  }

  findByPostId(postId: string): Promise<VideoAnalysisDocument | null> {
    return this.model.findOne({ post_id: postId }).exec();
  }

  findByUserId(userId: string, limit = 20): Promise<VideoAnalysisDocument[]> {
    return this.model.find({ user_id: userId }).sort({ createdAt: -1 }).limit(limit).exec();
  }

  async saveInsights(postId: string, insights: AiInsightsPayload): Promise<void> {
    await this.model
      .updateOne(
        { post_id: postId },
        {
          $set: {
            ai_insights: insights,
            ai_insights_generated_at: DateTime.utc().toJSDate(),
            computed_score: insights.ai_score,
          },
        },
      )
      .exec();
  }

  async saveScoreContext(postId: string, ctx: VideoAnalysisScoreContext): Promise<void> {
    await this.model.updateOne({ post_id: postId }, { $set: { score_context: ctx } }).exec();
  }

  findEnrichedByPostId(postId: string): Promise<VideoAnalysisDocument | null> {
    return this.model.findOne({ post_id: postId }).exec();
  }
}
