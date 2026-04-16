/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { PlayerSportEntity, SportEntity, SportMetricEntity } from '@app/common';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateSportDto } from './dtos/create-sport.dto';
import { SportService } from './sport.service';

describe('SportService', () => {
  const sportRepository = {
    findActiveAllWithMetrics: jest.fn(),
    findActiveByIdOrSlugWithMetrics: jest.fn(),
    findByIdWithMetrics: jest.fn(),
    findActiveByIds: jest.fn(),
    findConflict: jest.fn(),
    existsActiveById: jest.fn(),
    save: jest.fn(),
  };
  const playerSportRepository = {
    findByPlayerUserIdWithSportAndMetrics: jest.fn(),
    existsByPlayerAndSport: jest.fn(),
    assignToPlayer: jest.fn(),
  };
  const sportManagerRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => data),
    findOne: jest.fn(),
  };
  const metricManagerRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => data),
    remove: jest.fn(async (data) => data),
  };
  const playerSportManagerRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => data),
    delete: jest.fn(async () => undefined),
  };
  const manager = {
    getRepository: jest.fn((entity) => {
      if (entity === SportEntity) {
        return sportManagerRepo;
      }

      if (entity === SportMetricEntity) {
        return metricManagerRepo;
      }

      if (entity === PlayerSportEntity) {
        return playerSportManagerRepo;
      }

      throw new Error(`Unexpected repository token: ${String(entity)}`);
    }),
  };
  const dataSource = {
    transaction: jest.fn(async (callback: (entityManager: typeof manager) => unknown) => callback(manager)),
  };

  let service: SportService;

  const buildSport = (overrides: Partial<SportEntity> = {}): SportEntity =>
    ({
      id: 'sport-1',
      name: 'Basketball',
      slug: 'basketball',
      is_active: true,
      metrics: [
        {
          id: 'metric-2',
          name: 'Speed',
          key: 'speed',
          weight: 1,
        },
        {
          id: 'metric-1',
          name: 'Agility',
          key: 'agility',
          weight: 2,
        },
      ],
      ...overrides,
    }) as SportEntity;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SportService(
      sportRepository as never,
      playerSportRepository as never,
      dataSource as never as DataSource,
    );
  });

  it('lists active sports with sorted metrics in API shape', async () => {
    sportRepository.findActiveAllWithMetrics.mockResolvedValue([buildSport()]);

    await expect(service.listActiveSports()).resolves.toEqual([
      {
        id: 'sport-1',
        name: 'Basketball',
        slug: 'basketball',
        isActive: true,
        metrics: [
          { id: 'metric-1', name: 'Agility', key: 'agility', weight: 2 },
          { id: 'metric-2', name: 'Speed', key: 'speed', weight: 1 },
        ],
      },
    ]);
  });

  it('hides missing or inactive sports from public detail', async () => {
    sportRepository.findActiveByIdOrSlugWithMetrics.mockResolvedValue(null);

    await expect(service.getActiveSport('archery')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects duplicate metric keys before creating a sport', async () => {
    const dto: CreateSportDto = {
      name: 'Archery',
      slug: 'archery',
      metrics: [
        { name: 'Accuracy', key: 'accuracy', weight: 1 },
        { name: 'Accuracy 2', key: 'accuracy', weight: 2 },
      ],
    };

    await expect(service.createSport(dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(sportRepository.findConflict).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects conflicting sport names or slugs', async () => {
    sportRepository.findConflict.mockResolvedValue(buildSport({ id: 'sport-2', name: 'Archery', slug: 'archery' }));

    await expect(service.createSport({ name: 'Archery', slug: 'archery' })).rejects.toBeInstanceOf(ConflictException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('syncs metrics on update when the payload is provided', async () => {
    const existingSport = buildSport({
      metrics: [
        { id: 'metric-1', name: 'Accuracy', key: 'accuracy', weight: 1 } as SportMetricEntity,
        { id: 'metric-2', name: 'Focus', key: 'focus', weight: 2 } as SportMetricEntity,
      ],
    });

    sportRepository.findByIdWithMetrics.mockResolvedValue(existingSport);
    sportRepository.findConflict.mockResolvedValue(null);
    sportManagerRepo.findOne.mockResolvedValue(
      buildSport({
        name: 'Updated Archery',
        slug: 'updated-archery',
        metrics: [
          { id: 'metric-1', name: 'Accuracy+', key: 'accuracy', weight: 3 } as SportMetricEntity,
          { id: 'metric-3', name: 'Balance', key: 'balance', weight: 4 } as SportMetricEntity,
        ],
      }),
    );

    const result = await service.updateSport(existingSport.id, {
      name: 'Updated Archery',
      slug: 'updated-archery',
      metrics: [
        { id: 'metric-1', name: 'Accuracy+', key: 'accuracy', weight: 3 },
        { name: 'Balance', key: 'balance', weight: 4 },
      ],
    });

    expect(metricManagerRepo.remove).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'metric-2', key: 'focus' }),
    ]);
    expect(metricManagerRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'metric-1', key: 'accuracy', weight: 3 }),
      expect.objectContaining({ sport_id: existingSport.id, key: 'balance', weight: 4 }),
    ]);
    expect(result).toEqual(
      expect.objectContaining({
        name: 'Updated Archery',
        slug: 'updated-archery',
      }),
    );
  });

  it('toggles active state without deleting the sport', async () => {
    const sport = buildSport({ is_active: false });
    sportRepository.findByIdWithMetrics.mockResolvedValueOnce(sport).mockResolvedValueOnce({ ...sport, is_active: true });
    sportRepository.save.mockResolvedValue({ ...sport, is_active: true });

    await expect(service.setSportActiveState(sport.id, true)).resolves.toEqual(
      expect.objectContaining({ isActive: true }),
    );
    expect(sportRepository.save).toHaveBeenCalledWith(expect.objectContaining({ is_active: true }));
  });

  it('rejects duplicate ids when replacing player sports', async () => {
    await expect(service.replacePlayerSports('user-1', ['sport-1', 'sport-1'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(sportRepository.findActiveByIds).not.toHaveBeenCalled();
  });

  it('replaces player sports transactionally and returns the refreshed set', async () => {
    const sports = [
      buildSport({ id: 'sport-1', name: 'Archery', slug: 'archery', metrics: [] }),
      buildSport({ id: 'sport-2', name: 'Basketball', slug: 'basketball', metrics: [] }),
    ];

    sportRepository.findActiveByIds.mockResolvedValue(sports);
    playerSportRepository.findByPlayerUserIdWithSportAndMetrics.mockResolvedValue(
      sports.map(
        (sport) =>
          ({
            sport,
          }) as PlayerSportEntity,
      ),
    );

    const result = await service.replacePlayerSports('user-1', ['sport-1', 'sport-2']);

    expect(playerSportManagerRepo.delete).toHaveBeenCalledWith({ player_user_id: 'user-1' });
    expect(playerSportManagerRepo.save).toHaveBeenCalledWith([
      { player_user_id: 'user-1', sport_id: 'sport-1' },
      { player_user_id: 'user-1', sport_id: 'sport-2' },
    ]);
    expect(result).toEqual([
      expect.objectContaining({ id: 'sport-1', name: 'Archery' }),
      expect.objectContaining({ id: 'sport-2', name: 'Basketball' }),
    ]);
  });

  it('assigns the sport to the player if it is active but not yet assigned', async () => {
    sportRepository.existsActiveById.mockResolvedValue(true);
    playerSportRepository.existsByPlayerAndSport.mockResolvedValue(false);

    await service.ensurePlayerCanUseSport('user-1', 'sport-1');
    expect(playerSportRepository.assignToPlayer).toHaveBeenCalledWith('user-1', 'sport-1');
  });
});
