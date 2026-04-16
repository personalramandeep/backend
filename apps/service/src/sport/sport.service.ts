import { EExperienceLevel, EPlayingStyle, PlayerSportEntity, SportEntity, SportMetricEntity, SportPostOptions } from '@app/common';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { CreateSportDto } from './dtos/create-sport.dto';
import { SportMetricInputDto } from './dtos/sport-metric-input.dto';
import { UpdatePlayerSportProfileDto } from './dtos/update-player-sport-profile.dto';
import { UpdateSportDto } from './dtos/update-sport.dto';
import { PlayerSportRepository } from './repositories/player-sport.repository';
import { SportRepository } from './repositories/sport.repository';

type SportResponse = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  metrics: Array<{
    id: string;
    name: string;
    key: string;
    weight: number;
  }>;
  postOptions?: SportPostOptions | null;
  experienceLevel?: EExperienceLevel | null;
  playingStyle?: EPlayingStyle | null;
  goals?: string | null;
};

@Injectable()
export class SportService {
  constructor(
    private readonly sportRepository: SportRepository,
    private readonly playerSportRepository: PlayerSportRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async listActiveSports(): Promise<SportResponse[]> {
    const sports = await this.sportRepository.findActiveAllWithMetrics();
    return sports.map((sport) => this.toSportResponse(sport));
  }

  async listAllSports(): Promise<SportResponse[]> {
    const sports = await this.sportRepository.findAllWithMetrics();
    return sports.map((sport) => this.toSportResponse(sport));
  }

  async getActiveSport(sportIdOrSlug: string): Promise<SportResponse> {
    const sport = await this.sportRepository.findActiveByIdOrSlugWithMetrics(sportIdOrSlug);

    if (!sport) {
      throw new NotFoundException('Sport not found');
    }

    return this.toSportResponse(sport);
  }

  async createSport(dto: CreateSportDto): Promise<SportResponse> {
    this.assertUniqueMetricKeys(dto.metrics);
    await this.ensureNoSportConflict(dto.name, dto.slug);

    try {
      const sport = await this.dataSource.transaction(async (manager) => {
        const sportRepo = manager.getRepository(SportEntity);
        const metricRepo = manager.getRepository(SportMetricEntity);

        const sport = sportRepo.create({
          name: dto.name.trim(),
          slug: dto.slug.trim(),
          is_active: dto.isActive ?? true,
          post_options: dto.postOptions,
        });

        const savedSport = await sportRepo.save(sport);

        if (dto.metrics?.length) {
          const metrics = dto.metrics.map((metric) =>
            metricRepo.create({
              sport_id: savedSport.id,
              name: metric.name.trim(),
              key: metric.key.trim(),
              weight: metric.weight,
            }),
          );

          await metricRepo.save(metrics);
        }

        return sportRepo.findOne({
          where: { id: savedSport.id },
          relations: ['metrics'],
          order: {
            metrics: { key: 'ASC' },
          },
        });
      });

      if (!sport) {
        throw new NotFoundException('Sport not found after creation');
      }

      return this.toSportResponse(sport);
    } catch (error) {
      this.rethrowConstraintError(error);
      throw error;
    }
  }

  async updateSport(sportId: string, dto: UpdateSportDto): Promise<SportResponse> {
    const existingSport = await this.sportRepository.findByIdWithMetrics(sportId);

    if (!existingSport) {
      throw new NotFoundException('Sport not found');
    }

    const nextName = dto.name?.trim() ?? existingSport.name;
    const nextSlug = dto.slug?.trim() ?? existingSport.slug;

    if (dto.metrics) {
      this.assertUniqueMetricKeys(dto.metrics);
    }

    await this.ensureNoSportConflict(nextName, nextSlug, sportId);

    try {
      const sport = await this.dataSource.transaction(async (manager) => {
        const sportRepo = manager.getRepository(SportEntity);

        existingSport.name = nextName;
        existingSport.slug = nextSlug;

        if (dto.isActive !== undefined) {
          existingSport.is_active = dto.isActive;
        }
        
        if (dto.postOptions !== undefined) {
          existingSport.post_options = dto.postOptions;
        }

        await sportRepo.save(existingSport);

        if (dto.metrics) {
          await this.syncMetrics(manager, existingSport.id, existingSport.metrics || [], dto.metrics);
        }

        return sportRepo.findOne({
          where: { id: existingSport.id },
          relations: ['metrics'],
          order: {
            metrics: { key: 'ASC' },
          },
        });
      });

      if (!sport) {
        throw new NotFoundException('Sport not found after update');
      }

      return this.toSportResponse(sport);
    } catch (error) {
      this.rethrowConstraintError(error);
      throw error;
    }
  }

  async setSportActiveState(sportId: string, isActive: boolean): Promise<SportResponse> {
    const sport = await this.sportRepository.findByIdWithMetrics(sportId);

    if (!sport) {
      throw new NotFoundException('Sport not found');
    }

    sport.is_active = isActive;
    const saved = await this.sportRepository.save(sport);
    const hydrated = await this.sportRepository.findByIdWithMetrics(saved.id);

    if (!hydrated) {
      throw new NotFoundException('Sport not found after state change');
    }

    return this.toSportResponse(hydrated);
  }

  async getPlayerSports(userId: string): Promise<SportResponse[]> {
    const assignments = await this.playerSportRepository.findByPlayerUserIdWithSportAndMetrics(userId);

    return assignments
      .filter((assignment) => assignment.sport?.is_active)
      .map((assignment) => ({
        ...this.toSportResponse(assignment.sport),
        experienceLevel: assignment.experience_level,
        playingStyle: assignment.playing_style,
        goals: assignment.goals,
      }));
  }

  async replacePlayerSports(userId: string, sportIds: string[]): Promise<SportResponse[]> {
    const normalizedSportIds = sportIds.map((sportId) => sportId.trim());

    if (new Set(normalizedSportIds).size !== normalizedSportIds.length) {
      throw new BadRequestException('Duplicate sport ids are not allowed');
    }

    const sports = await this.sportRepository.findActiveByIds(normalizedSportIds);
    const foundIds = new Set(sports.map((sport) => sport.id));

    if (sports.length !== normalizedSportIds.length || normalizedSportIds.some((sportId) => !foundIds.has(sportId))) {
      throw new BadRequestException('One or more sports are invalid or inactive');
    }

    await this.dataSource.transaction(async (manager) => {
      const playerSportRepo = manager.getRepository(PlayerSportEntity);

      const existing = await playerSportRepo.find({ where: { player_user_id: userId } });
      const existingIds = new Set(existing.map((e) => e.sport_id));
      const requestedIds = new Set(normalizedSportIds);

      const toDelete = existing.filter((e) => !requestedIds.has(e.sport_id));
      if (toDelete.length > 0) {
        await playerSportRepo.remove(toDelete);
      }

      const toAdd = normalizedSportIds.filter((id) => !existingIds.has(id));
      if (toAdd.length > 0) {
        const entities = toAdd.map((sportId) =>
          playerSportRepo.create({
            player_user_id: userId,
            sport_id: sportId,
          }),
        );
        await playerSportRepo.save(entities);
      }
    });

    return this.getPlayerSports(userId);
  }

  async ensurePlayerCanUseSport(userId: string, sportId: string): Promise<void> {
    const sportExists = await this.sportRepository.existsActiveById(sportId);

    if (!sportExists) {
      throw new BadRequestException('Sport not found or inactive');
    }

    const assigned = await this.playerSportRepository.existsByPlayerAndSport(userId, sportId);

    if (!assigned) {
      await this.playerSportRepository.assignToPlayer(userId, sportId);
    }
  }

  async updatePlayerSportProfile(
    userId: string,
    sportId: string,
    dto: UpdatePlayerSportProfileDto,
  ): Promise<SportResponse> {
    const player_sport = await this.playerSportRepository.findByPlayerAndSport(userId, sportId);

    if (!player_sport || !player_sport.sport?.is_active) {
      throw new NotFoundException('Player sport not found or inactive');
    }

    if (dto.experienceLevel !== undefined) player_sport.experience_level = dto.experienceLevel;
    if (dto.playingStyle !== undefined) player_sport.playing_style = dto.playingStyle;
    if (dto.goals !== undefined) player_sport.goals = dto.goals;

    await this.playerSportRepository.save(player_sport);

    return {
      ...this.toSportResponse(player_sport.sport),
      experienceLevel: player_sport.experience_level,
      playingStyle: player_sport.playing_style,
      goals: player_sport.goals,
    };
  }

  private async ensureNoSportConflict(name: string, slug: string, ignoreId?: string): Promise<void> {
    const conflict = await this.sportRepository.findConflict(name.trim(), slug.trim(), ignoreId);

    if (!conflict) {
      return;
    }

    if (conflict.id === ignoreId) {
      return;
    }

    if (conflict.name.toLowerCase() === name.trim().toLowerCase()) {
      throw new ConflictException('Sport name already exists');
    }

    throw new ConflictException('Sport slug already exists');
  }

  private assertUniqueMetricKeys(metrics?: SportMetricInputDto[]): void {
    if (!metrics?.length) {
      return;
    }

    const normalizedKeys = metrics.map((metric) => metric.key.trim().toLowerCase());
    const uniqueKeys = new Set(normalizedKeys);

    if (uniqueKeys.size !== normalizedKeys.length) {
      throw new BadRequestException('Duplicate sport metric keys are not allowed');
    }
  }

  private async syncMetrics(
    manager: DataSource['manager'],
    sportId: string,
    existingMetrics: SportMetricEntity[],
    nextMetrics: SportMetricInputDto[],
  ): Promise<void> {
    const metricRepo = manager.getRepository(SportMetricEntity);
    const existingById = new Map(existingMetrics.map((metric) => [metric.id, metric]));
    const requestedIds = new Set(nextMetrics.filter((metric) => metric.id).map((metric) => metric.id as string));

    for (const requestedId of requestedIds) {
      if (!existingById.has(requestedId)) {
        throw new BadRequestException(`Metric ${requestedId} does not belong to sport ${sportId}`);
      }
    }

    const toRemove = existingMetrics.filter((metric) => !requestedIds.has(metric.id));
    if (toRemove.length) {
      await metricRepo.remove(toRemove);
    }

    const toSave = nextMetrics.map((metric) => {
      const existingMetric = metric.id ? existingById.get(metric.id) : undefined;

      if (existingMetric) {
        existingMetric.name = metric.name.trim();
        existingMetric.key = metric.key.trim();
        existingMetric.weight = metric.weight;
        return existingMetric;
      }

      return metricRepo.create({
        sport_id: sportId,
        name: metric.name.trim(),
        key: metric.key.trim(),
        weight: metric.weight,
      });
    });

    if (toSave.length) {
      await metricRepo.save(toSave);
    }
  }

  private toSportResponse(sport: SportEntity): SportResponse {
    return {
      id: sport.id,
      name: sport.name,
      slug: sport.slug,
      isActive: sport.is_active,
      postOptions: sport.post_options ?? null,
      metrics: (sport.metrics || [])
        .slice()
        .sort((left, right) => left.key.localeCompare(right.key))
        .map((metric) => ({
          id: metric.id,
          name: metric.name,
          key: metric.key,
          weight: metric.weight,
        })),
    };
  }

  private rethrowConstraintError(error: unknown): void {
    if (!(error instanceof QueryFailedError)) {
      return;
    }

    const queryError = error as QueryFailedError & { driverError?: { code?: string } };
    if (queryError.driverError?.code === '23505') {
      throw new ConflictException('Sport or metric already exists');
    }
  }
}
