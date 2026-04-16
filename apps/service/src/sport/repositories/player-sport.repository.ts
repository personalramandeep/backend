import { PlayerSportEntity } from '@app/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export class PlayerSportRepository {
  constructor(@InjectRepository(PlayerSportEntity) private readonly repo: Repository<PlayerSportEntity>) {}

  findByPlayerUserIdWithSportAndMetrics(playerUserId: string): Promise<PlayerSportEntity[]> {
    return this.repo.find({
      where: { player_user_id: playerUserId },
      relations: ['sport', 'sport.metrics'],
      order: {
        sport: {
          name: 'ASC',
          metrics: { key: 'ASC' },
        },
      },
    });
  }

  async existsByPlayerAndSport(playerUserId: string, sportId: string): Promise<boolean> {
    return this.repo.exists({
      where: {
        player_user_id: playerUserId,
        sport_id: sportId,
      },
    });
  }

  async findByPlayerAndSport(playerUserId: string, sportId: string): Promise<PlayerSportEntity | null> {
    return this.repo.findOne({
      where: {
        player_user_id: playerUserId,
        sport_id: sportId,
      },
      relations: ['sport', 'sport.metrics'],
    });
  }

  async save(entity: PlayerSportEntity): Promise<PlayerSportEntity> {
    return this.repo.save(entity);
  }

  async assignToPlayer(playerUserId: string, sportId: string): Promise<PlayerSportEntity> {
    const entity = this.repo.create({
      player_user_id: playerUserId,
      sport_id: sportId,
    });
    return this.repo.save(entity);
  }
}
