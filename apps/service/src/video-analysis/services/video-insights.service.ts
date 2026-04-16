import {
  AiInsightsPayload,
  EnginePayload,
  PlayerProfileEntity,
  PlayerSportEntity,
  VideoAnalysisDocument,
} from '@app/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '../../config/config.service';
import { LLM_PROVIDER, LlmProvider } from '../../llm/providers/llm-provider.interface';
import { StorageService } from '../../storage/storage.service';
import { AiInsightsContext, AiInsightsPlayerProfile } from '../dtos/ai-insights-context.dto';
import { VideoAnalysisRepository } from '../repositories/video-analysis.repository';
import { VideoInsightsPromptBuilder } from './video-insights-prompt.builder';

const MAX_SHOT_FRAMES = 6;
const ESTIMATED_FPS = 30;

function sampleEvenly<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  return Array.from({ length: max }, (_, i) => arr[Math.floor(i * step)]);
}

function stripFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

@Injectable()
export class VideoInsightsService {
  private readonly logger = new Logger(VideoInsightsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly promptBuilder: VideoInsightsPromptBuilder,
    private readonly videoAnalysisRepo: VideoAnalysisRepository,

    @InjectRepository(PlayerSportEntity)
    private readonly playerSportRepo: Repository<PlayerSportEntity>,

    @InjectRepository(PlayerProfileEntity)
    private readonly playerProfileRepo: Repository<PlayerProfileEntity>,

    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}

  async generate(analysis: VideoAnalysisDocument): Promise<AiInsightsPayload | null> {
    const postId = analysis.post_id;
    this.logger.log(`[insights] Starting generation for post ${postId}`);

    try {
      const [playerSport, profile] = await Promise.all([
        this.playerSportRepo.findOne({
          where: {
            player_user_id: analysis.user_id,
            sport_id: analysis.sport_id,
          },
        }),
        this.playerProfileRepo.findOne({
          where: { user_id: analysis.user_id },
        }),
      ]);

      const rawLevel = playerSport?.experience_level ?? null;
      const skillLevel = rawLevel
        ? ((rawLevel.charAt(0).toUpperCase() +
            rawLevel.slice(1)) as AiInsightsPlayerProfile['skill_level'])
        : 'Intermediate';

      const playerProfile: AiInsightsPlayerProfile = {
        weight_kg: profile?.weight_kg ?? 70,
        height_m: profile?.height_cm ? profile.height_cm / 100 : 1.75,
        skill_level: skillLevel,
      };

      const engine_payload = (analysis.engine_payload ?? {}) as EnginePayload;

      const [heatmapBuffer, shotFrameBuffers] = await this.downloadAssets(
        engine_payload.heatmap_path ?? null,
        engine_payload.shot_frames ?? [],
        this.configService.gcpConfig.framesBucketName,
      );

      const ctx: AiInsightsContext = {
        postId,
        metrics: {
          step_count: engine_payload.step_count ?? 0,
          distance_travelled_m: engine_payload.distance_travelled_m ?? 0,
          sport_metrics: engine_payload.sport_metrics ?? {},
          total_frames: engine_payload.total_frames ?? 0,
          clip_duration_sec:
            engine_payload.duration ??
            Math.round((engine_payload.total_frames ?? 0) / ESTIMATED_FPS),
          record_angle: engine_payload.record_angle ?? 'backcourt',
        },
        playerProfile,
        heatmapBuffer,
        shotFrameBuffers,
      };

      const { prompt, images } = this.promptBuilder.build(ctx);
      this.logger.debug(`[insights] Calling LLM for post ${postId} — images: ${images.length}`);
      this.logger.debug(`[insights] LLM prompt:\n${prompt}`); // TODO: remove me
      const raw = await this.llm.complete(prompt, images);

      const insights = this.parseInsights(raw);
      if (!insights) {
        this.logger.warn(`[insights] Malformed LLM response for post ${postId} — skipping persist`);
        return null;
      }

      // TODO: remove me
      this.logger.log(
        `[insights] Generated insights for post ${postId})`,
        JSON.stringify(insights, null, 2),
      );

      await this.videoAnalysisRepo.saveInsights(postId, insights);

      this.logger.log(
        `[insights] Saved insights for post ${postId} — ai_score: ${insights.ai_score}, calories: ${insights.calories_per_set}`,
      );

      return insights;
    } catch (err) {
      this.logger.error(
        `[insights] Generation failed for post ${postId}`,
        err instanceof Error ? err.stack : String(err),
      );
      return null;
    }
  }

  private async downloadAssets(
    heatmapPath: string | null | undefined,
    allShotFrames: string[],
    framesBucketName: string,
  ): Promise<[Buffer | null, Buffer[]]> {
    const sampledFrames = sampleEvenly(allShotFrames, MAX_SHOT_FRAMES);

    const heatmapKey = heatmapPath ?? null;
    const frameKeys = sampledFrames;

    const imageBuffers = await Promise.allSettled([
      heatmapKey ? this.storageService.downloadObject(heatmapKey) : Promise.resolve(null),
      ...frameKeys.map((key) => this.storageService.downloadObject(key, framesBucketName)),
    ]);

    const [heatmapResult, ...frameResults] = imageBuffers;

    const heatmapBuffer = heatmapResult.status === 'fulfilled' ? heatmapResult.value : null;

    const shotFrameBuffers: Buffer[] = frameResults
      .filter((r): r is PromiseFulfilledResult<Buffer> => {
        return r.status === 'fulfilled' && r.value !== null;
      })
      .map((r) => r.value);

    this.logger.debug(
      `[insights] Assets: heatmap=${!!heatmapBuffer}, frames=${shotFrameBuffers.length}/${sampledFrames.length}`,
    );

    return [heatmapBuffer, shotFrameBuffers];
  }

  private parseInsights(raw: string): AiInsightsPayload | null {
    const REQUIRED_KEYS: (keyof AiInsightsPayload)[] = [
      'ai_score',
      'calories_per_set',
      'summary',
      'skill_score',
      'skill_breakdown',
      'strengths',
      'improvements',
      'recommendations',
      'movement_analysis',
      'ai_coach',
    ];

    try {
      const cleaned = stripFences(raw);
      const parsed = JSON.parse(cleaned) as Record<string, unknown>;

      const missing = REQUIRED_KEYS.filter((k) => !(k in parsed));
      if (missing.length > 0) {
        this.logger.warn(`[insights] Missing keys in LLM response: ${missing.join(', ')}`);
        return null;
      }

      return parsed as unknown as AiInsightsPayload;
    } catch (err) {
      this.logger.warn(
        `[insights] Failed to parse LLM JSON: ${err instanceof Error ? err.message : String(err)}`,
      );
      this.logger.debug(`[insights] Raw LLM response: ${raw.slice(0, 500)}`);
      return null;
    }
  }
}
