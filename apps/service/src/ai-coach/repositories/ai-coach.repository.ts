import {
  AiCoachMessageDocument,
  AiCoachMessageEntity,
  AiCoachSessionDocument,
  AiCoachSessionEntity,
} from '@app/common';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';

@Injectable()
export class AiCoachRepository {
  private readonly logger = new Logger(AiCoachRepository.name);

  constructor(
    @InjectModel(AiCoachSessionEntity.name)
    private readonly sessionModel: Model<AiCoachSessionDocument>,
    @InjectModel(AiCoachMessageEntity.name)
    private readonly messageModel: Model<AiCoachMessageDocument>,
  ) {}

  async resolveSession(userId: string, timeoutMinutes: number): Promise<AiCoachSessionDocument> {
    const lastSession = await this.sessionModel
      .findOne({ user_id: userId })
      .sort({ last_activity_at: -1 })
      .exec();

    // TODO: use luxon
    const now = new Date();
    if (lastSession) {
      const diffMs = now.getTime() - lastSession.last_activity_at.getTime();
      const diffMins = diffMs / (1000 * 60);

      if (diffMins <= timeoutMinutes) {
        this.logger.debug(
          `Reusing existing session: userId=${userId} sessionId=${lastSession._id.toString()} idleMinutes=${diffMins.toFixed(1)}`,
        );
        return lastSession;
      }
      this.logger.debug(
        `Session timed out for userId=${userId} — creating new session (idleMinutes=${diffMins.toFixed(1)})`,
      );
    }

    const newSession = new this.sessionModel({
      user_id: userId,
      started_at: now,
      last_activity_at: now,
      message_count: 0,
    });

    return newSession.save();
  }

  async appendMessages(
    sessionId: mongoose.Types.ObjectId,
    userId: string,
    userMsg: string,
    aiReply: string,
  ): Promise<void> {
    const now = new Date();

    const userMessage = new this.messageModel({
      session_id: sessionId,
      user_id: userId,
      role: 'user',
      content: userMsg,
      created_at: now,
    });

    const aiMessage = new this.messageModel({
      session_id: sessionId,
      user_id: userId,
      role: 'assistant',
      content: aiReply,
      created_at: new Date(now.getTime() + 1), // slightly after to preserve order
    });

    await Promise.all([userMessage.save(), aiMessage.save()]);

    await this.sessionModel.updateOne(
      { _id: sessionId },
      {
        $inc: { message_count: 2 },
        $set: { last_activity_at: aiMessage.created_at },
      },
    );
  }

  async getSessionContext(
    sessionId: mongoose.Types.ObjectId,
    limit: number,
  ): Promise<AiCoachMessageDocument[]> {
    const messages = await this.messageModel
      .find({ session_id: sessionId })
      .sort({ created_at: -1 })
      .limit(limit)
      .lean()
      .exec();

    return messages.reverse();
  }

  async getSessions(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<AiCoachSessionDocument[]> {
    return this.sessionModel
      .find({ user_id: userId })
      .sort({ last_activity_at: -1 })
      .skip(offset)
      .limit(limit)
      .lean()
      .exec();
  }

  async getMessages(
    sessionId: mongoose.Types.ObjectId,
    limit: number = 50,
    offset: number = 0,
  ): Promise<AiCoachMessageDocument[]> {
    return this.messageModel
      .find({ session_id: sessionId })
      .sort({ created_at: 1 })
      .skip(offset)
      .limit(limit)
      .lean()
      .exec();
  }
}
