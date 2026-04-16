import { LeaderboardSnapshotEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class LeaderboardSnapshotRepository {
  constructor(
    @InjectModel(LeaderboardSnapshotEntity.name)
    private readonly model: Model<LeaderboardSnapshotEntity>,
  ) {}

  /** Upsert a snapshot for a given (user × sport × scope × window × date). */
  async upsert(data: {
    userId: string;
    sportId: string;
    scope: string;
    window: string;
    rank: number;
    prevRank: number | null;
    rankDelta: number | null;
    avgScore: number;
    snapshotDate: string;
  }): Promise<LeaderboardSnapshotEntity> {
    return this.model
      .findOneAndUpdate(
        {
          user_id: data.userId,
          sport_id: data.sportId,
          scope: data.scope,
          window: data.window,
          snapshot_date: data.snapshotDate,
        },
        {
          $set: {
            rank: data.rank,
            prev_rank: data.prevRank,
            rank_delta: data.rankDelta,
            avg_score: data.avgScore,
          },
          $setOnInsert: {
            user_id: data.userId,
            sport_id: data.sportId,
            scope: data.scope,
            window: data.window,
            snapshot_date: data.snapshotDate,
          },
        },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();
  }

  findLatestBefore(
    userId: string,
    sportId: string,
    scope: string,
    window: string,
    beforeDate: string,
  ): Promise<LeaderboardSnapshotEntity | null> {
    return this.model
      .findOne(
        {
          user_id: userId,
          sport_id: sportId,
          scope,
          window,
          snapshot_date: { $lt: beforeDate },
        },
        null,
        { sort: { snapshot_date: -1 } },
      )
      .exec();
  }

  findHistory(
    userId: string,
    sportId: string,
    scope: string,
    window: string,
    limit = 30,
  ): Promise<LeaderboardSnapshotEntity[]> {
    return this.model
      .find({ user_id: userId, sport_id: sportId, scope, window })
      .sort({ snapshot_date: -1 })
      .limit(limit)
      .exec();
  }

  async findLatestBeforeMany(
    userIds: string[],
    sportId: string,
    scope: string,
    window: string,
    beforeDate: string,
  ): Promise<Map<string, LeaderboardSnapshotEntity>> {
    const docs = await this.model
      .aggregate<{ _id: string; doc: LeaderboardSnapshotEntity }>([
        {
          $match: {
            user_id: { $in: userIds },
            sport_id: sportId,
            scope,
            window,
            snapshot_date: { $lt: beforeDate },
          },
        },
        { $sort: { snapshot_date: -1 } },
        { $group: { _id: '$user_id', doc: { $first: '$$ROOT' } } },
      ])
      .exec();

    const map = new Map<string, LeaderboardSnapshotEntity>();
    for (const { _id, doc } of docs) map.set(_id, doc);
    return map;
  }

  async findLatestForMany(
    userIds: string[],
    sportId: string,
    scope: string,
    window: string,
  ): Promise<Map<string, LeaderboardSnapshotEntity>> {
    const docs = await this.model
      .aggregate<{
        _id: string;
        doc: LeaderboardSnapshotEntity;
      }>([
        {
          $match: {
            user_id: { $in: userIds },
            sport_id: sportId,
            scope,
            window,
          },
        },
        { $sort: { snapshot_date: -1 } },
        { $group: { _id: '$user_id', doc: { $first: '$$ROOT' } } },
      ])
      .exec();

    const map = new Map<string, LeaderboardSnapshotEntity>();
    for (const { _id, doc } of docs) map.set(_id, doc);
    return map;
  }

  findLatestForUser(
    userId: string,
    sportId: string,
    scope: string,
    window: string,
  ): Promise<LeaderboardSnapshotEntity | null> {
    return this.model
      .findOne({
        user_id: userId,
        sport_id: sportId,
        scope,
        window,
      })
      .sort({ snapshot_date: -1 })
      .exec();
  }
}
