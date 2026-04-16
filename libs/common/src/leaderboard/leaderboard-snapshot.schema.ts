import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { IMongodbBaseDocument, MONGODB_BASE_SCHEMA_OPTIONS, MongodbBaseEntity } from '../base';

/** Daily snapshot of a player's rank for a given (sport × scope × window).
 *  Used for rank movement history and trend charts.
 *
 *  scope examples:  'global' | 'country:IND' | 'state:IND:Karnataka'  (geo — future)
 *  window examples: 'all_time' | 'weekly:2025-W14' | 'monthly:2025-04'  (time — future)
 */
@Schema({ collection: 'leaderboard_snapshots', ...MONGODB_BASE_SCHEMA_OPTIONS })
export class LeaderboardSnapshotEntity extends MongodbBaseEntity {
  @Prop({ type: String, required: true })
  user_id: string;

  @Prop({ type: String, required: true })
  sport_id: string;

  @Prop({ type: String, required: true, default: 'global' })
  scope: string;

  @Prop({ type: String, required: true, default: 'all_time' })
  window: string;

  /** Rank at time of snapshot (1-indexed). */
  @Prop({ type: Number, required: true })
  rank: number;

  @Prop({ type: Number, default: null })
  prev_rank: number | null;

  /** Positive = moved up, negative = moved down, 0 = no change. */
  @Prop({ type: Number, default: null })
  rank_delta: number | null;

  @Prop({ type: Number, required: true })
  avg_score: number;

  /** ISO date string 'YYYY-MM-DD' of snapshot day. */
  @Prop({ type: String, required: true })
  snapshot_date: string;
}

export type LeaderboardSnapshotDocument = HydratedDocument<LeaderboardSnapshotEntity> &
  IMongodbBaseDocument;

export const LeaderboardSnapshotSchema = SchemaFactory.createForClass(LeaderboardSnapshotEntity);

// player's rank history for sport X, global, all_time
LeaderboardSnapshotSchema.index(
  { user_id: 1, sport_id: 1, scope: 1, window: 1, snapshot_date: -1 },
  { unique: true },
);

// top-N for scope X, window Y on date Z
LeaderboardSnapshotSchema.index({ scope: 1, window: 1, snapshot_date: -1, rank: 1 });
