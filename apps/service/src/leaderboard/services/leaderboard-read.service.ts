import { Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import { ConfigService } from '../../config/config.service';
import { StorageService } from '../../storage/storage.service';
import { CacheKeyBuilder } from '../../redis/cache/cache-key.builder';
import { CacheService } from '../../redis/cache/cache.service';
import { UserRepository } from '../../user/repositories/user.repository';
import {
  AroundMeResponseDto,
  LeaderboardEntryDto,
  LeaderboardResponseDto,
  LeaderboardWidgetResponseDto,
  MyRankResponseDto,
} from '../dtos/leaderboard-response.dto';
import { LB_DEFAULT_SCOPE, LB_DEFAULT_WINDOW } from '../leaderboard.constants';
import { LeaderboardScope, LeaderboardWindow } from '../leaderboard.types';
import { LeaderboardSnapshotRepository } from '../repositories/leaderboard-snapshot.repository';
import { PlayerPerformanceScoreRepository } from '../repositories/player-performance-score.repository';
import { UniversalPerformanceScoreRepository } from '../repositories/universal-performance-score.repository';
import { LeaderboardRedisService, UNIVERSAL_SPORT_KEY } from './leaderboard-redis.service';

const WIDGET_CACHE_TTL = 60;
const WIDGET_TOP_N = 10;

interface UserDisplayInfo {
  username: string;
  full_name: string;
  profile_pic_url: string | null;
}

@Injectable()
export class LeaderboardReadService {
  private readonly logger = new Logger(LeaderboardReadService.name);

  constructor(
    private readonly lbRedis: LeaderboardRedisService,
    private readonly cacheService: CacheService,
    private readonly cacheKeyBuilder: CacheKeyBuilder,
    private readonly userRepo: UserRepository,
    private readonly perfScoreRepo: PlayerPerformanceScoreRepository,
    private readonly universalScoreRepo: UniversalPerformanceScoreRepository,
    private readonly snapshotRepo: LeaderboardSnapshotRepository,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  private resolveKey(
    sportId: string | undefined,
    scope: LeaderboardScope = LB_DEFAULT_SCOPE,
    window: LeaderboardWindow = LB_DEFAULT_WINDOW,
  ): string {
    const board =
      (this.configService.sportLeaderboardEnabled ? sportId : undefined) ?? UNIVERSAL_SPORT_KEY;
    return this.lbRedis.buildKey(board, scope, window);
  }

  private async fetchUserMap(userIds: string[]): Promise<Map<string, UserDisplayInfo>> {
    const map = new Map<string, UserDisplayInfo>();
    if (!userIds.length) return map;

    const users = await this.userRepo.findByIds(userIds);
    for (const user of users) {
      map.set(user.id, {
        username: user.username,
        full_name: user.full_name,
        profile_pic_url: this.storageService.buildOptionalPublicUrl(user.profile_pic_url),
      });
    }
    return map;
  }

  private async fetchScoreMetaMap(
    userIds: string[],
    sportId: string | undefined,
  ): Promise<Map<string, { prev_avg_score: number; video_count: number }>> {
    const map = new Map<string, { prev_avg_score: number; video_count: number }>();
    if (!userIds.length) return map;

    const rows = sportId
      ? await this.perfScoreRepo.findByUserIdsAndSport(userIds, sportId)
      : await this.universalScoreRepo.findByUserIds(userIds);

    for (const row of rows) {
      map.set(row.user_id, {
        prev_avg_score: row.prev_avg_score,
        video_count: row.video_count,
      });
    }
    return map;
  }

  private async fetchSnapshotMap(
    userIds: string[],
    sportId: string | undefined,
  ): Promise<Map<string, { prev_rank: number | null }>> {
    const map = new Map<string, { prev_rank: number | null }>();
    if (!userIds.length) return map;

    const board = sportId ?? UNIVERSAL_SPORT_KEY;
    const snapshotMap = await this.snapshotRepo.findLatestForMany(
      userIds,
      board,
      LB_DEFAULT_SCOPE,
      LB_DEFAULT_WINDOW,
    );

    for (const [userId, snap] of snapshotMap) {
      map.set(userId, { prev_rank: snap?.rank ?? null });
    }
    return map;
  }

  private buildEntries(
    members: { userId: string; score: number }[],
    startRank: number,
    userMap: Map<string, UserDisplayInfo>,
    scoreMeta: Map<string, { prev_avg_score: number; video_count: number }>,
    snapshotMap: Map<string, { prev_rank: number | null }>,
    requestingUserId: string | null,
  ): LeaderboardEntryDto[] {
    return members.map((m, i) => {
      const user = userMap.get(m.userId);
      const meta = scoreMeta.get(m.userId);
      const snap = snapshotMap.get(m.userId);
      const rank = startRank + i + 1; // 1-indexed
      const prevScore = meta?.prev_avg_score ?? m.score;
      const prevRank = snap?.prev_rank ?? null;

      return {
        rank,
        prev_rank: prevRank,
        rank_delta: prevRank !== null ? prevRank - rank : null, // positive = moved up
        user_id: m.userId,
        username: user?.username ?? m.userId,
        full_name: user?.full_name ?? '',
        profile_pic_url: user?.profile_pic_url ?? null,
        avg_score: Math.round(m.score * 100) / 100,
        score_delta: Math.round((m.score - prevScore) * 100) / 100,
        video_count: meta?.video_count ?? 0,
        is_me: m.userId === requestingUserId,
      };
    });
  }

  async getLeaderboard(
    requestingUserId: string,
    sportId: string | undefined,
    offset: number,
    limit: number,
  ): Promise<LeaderboardResponseDto> {
    const key = this.resolveKey(sportId);
    const total = await this.lbRedis.zcard(key);

    if (total === 0) {
      return {
        data: [],
        total: 0,
        sport_id: sportId ?? null,
        scope: LB_DEFAULT_SCOPE,
        window: LB_DEFAULT_WINDOW,
        generated_at: DateTime.utc().toISO(),
      };
    }

    const members = await this.lbRedis.zrangeRev(key, offset, offset + limit - 1);
    const userIds = members.map((m) => m.userId);

    const [userMap, scoreMeta, snapshotMap] = await Promise.all([
      this.fetchUserMap(userIds),
      this.fetchScoreMetaMap(userIds, sportId),
      this.fetchSnapshotMap(userIds, sportId),
    ]);

    return {
      data: this.buildEntries(members, offset, userMap, scoreMeta, snapshotMap, requestingUserId),
      total,
      sport_id: sportId ?? null,
      scope: LB_DEFAULT_SCOPE,
      window: LB_DEFAULT_WINDOW,
      generated_at: DateTime.utc().toISO(),
    };
  }

  async getMyRank(userId: string, sportId: string | undefined): Promise<MyRankResponseDto> {
    const key = this.resolveKey(sportId);
    const [rank0, score, total] = await Promise.all([
      this.lbRedis.zrevrank(key, userId),
      this.lbRedis.zscore(key, userId),
      this.lbRedis.zcard(key),
    ]);

    if (rank0 === null || score === null) {
      return {
        rank: null,
        prev_rank: null,
        rank_delta: null,
        avg_score: 0,
        score_delta: 0,
        video_count: 0,
        percentile: null,
        total_players: total,
      };
    }

    const rank = rank0 + 1; // 1-indexed
    const board = sportId ?? UNIVERSAL_SPORT_KEY;

    const [meta, snap] = await Promise.all([
      sportId
        ? this.perfScoreRepo.findByUserAndSport(userId, sportId)
        : this.universalScoreRepo.findByUserId(userId),
      this.snapshotRepo.findLatestForUser(userId, board, LB_DEFAULT_SCOPE, LB_DEFAULT_WINDOW),
    ]);

    const percentile = total > 1 ? Math.round(((total - rank) / (total - 1)) * 100) : 100;
    const prevRank = snap?.rank ?? null;

    return {
      rank,
      prev_rank: prevRank,
      rank_delta: prevRank !== null ? prevRank - rank : null,
      avg_score: Math.round(score * 100) / 100,
      score_delta: Math.round((score - (meta?.prev_avg_score ?? score)) * 100) / 100,
      video_count: meta?.video_count ?? 0,
      percentile,
      total_players: total,
    };
  }

  async getAroundMe(
    userId: string,
    sportId: string | undefined,
    radius: number,
  ): Promise<AroundMeResponseDto> {
    const key = this.resolveKey(sportId);
    const [rank0, total] = await Promise.all([
      this.lbRedis.zrevrank(key, userId),
      this.lbRedis.zcard(key),
    ]);

    if (rank0 === null) {
      return { entries: [], my_rank: null, total_players: total };
    }

    const start = Math.max(0, rank0 - radius);
    const stop = Math.min(total - 1, rank0 + radius);

    const members = await this.lbRedis.zrangeRev(key, start, stop);
    const userIds = members.map((m) => m.userId);

    const [userMap, scoreMeta, snapshotMap] = await Promise.all([
      this.fetchUserMap(userIds),
      this.fetchScoreMetaMap(userIds, sportId),
      this.fetchSnapshotMap(userIds, sportId),
    ]);

    return {
      entries: this.buildEntries(members, start, userMap, scoreMeta, snapshotMap, userId),
      my_rank: rank0 + 1,
      total_players: total,
    };
  }

  async getWidget(
    requestingUserId: string,
    sportId: string | undefined,
  ): Promise<LeaderboardWidgetResponseDto> {
    const cacheKey = this.cacheKeyBuilder.buildExact(
      'leaderboard:widget',
      `${sportId ?? UNIVERSAL_SPORT_KEY}:${LB_DEFAULT_SCOPE}`,
    );

    const cached = await this.cacheService.get<LeaderboardWidgetResponseDto>(cacheKey);
    if (cached) {
      const age = WIDGET_CACHE_TTL - (await this.cacheService.ttl(cacheKey));
      cached.entries = cached.entries.map((e) => ({ ...e, is_me: e.user_id === requestingUserId }));
      cached.cache_age_seconds = Math.max(0, age);
      return cached;
    }

    const key = this.resolveKey(sportId);

    const [total, members, myRank0, myScore] = await Promise.all([
      this.lbRedis.zcard(key),
      this.lbRedis.zrangeRev(key, 0, WIDGET_TOP_N - 1),
      this.lbRedis.zrevrank(key, requestingUserId),
      this.lbRedis.zscore(key, requestingUserId),
    ]);

    const userIds = members.map((m) => m.userId);
    const [userMap, scoreMeta, snapshotMap] = await Promise.all([
      this.fetchUserMap(userIds),
      this.fetchScoreMetaMap(userIds, sportId),
      this.fetchSnapshotMap(userIds, sportId),
    ]);

    const entriesForCache = this.buildEntries(
      members,
      0,
      userMap,
      scoreMeta,
      snapshotMap,
      null, // null → is_me = false for all
    );

    const cachedPayload: LeaderboardWidgetResponseDto = {
      entries: entriesForCache,
      my_rank: myRank0 !== null ? myRank0 + 1 : null,
      my_avg_score: myScore,
      total_players: total,
      sport_id: sportId ?? null,
      scope: LB_DEFAULT_SCOPE,
      cache_age_seconds: 0,
    };

    await this.cacheService.set(cacheKey, cachedPayload, WIDGET_CACHE_TTL);

    return {
      ...cachedPayload,
      entries: entriesForCache.map((e) => ({ ...e, is_me: e.user_id === requestingUserId })),
    };
  }

  async invalidateWidgetCache(sportId: string | undefined): Promise<void> {
    const cacheKey = this.cacheKeyBuilder.buildExact(
      'leaderboard:widget',
      `${sportId ?? UNIVERSAL_SPORT_KEY}:${LB_DEFAULT_SCOPE}`,
    );
    await this.cacheService.del(cacheKey);
  }
}
