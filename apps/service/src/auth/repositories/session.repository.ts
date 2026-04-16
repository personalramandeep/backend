import { UserSessionEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';

@Injectable()
export class SessionRepository {
  constructor(@InjectRepository(UserSessionEntity) private readonly repo: Repository<UserSessionEntity>) {}

  create(data: Partial<UserSessionEntity>): UserSessionEntity {
    return this.repo.create(data);
  }

  save(session: UserSessionEntity): Promise<UserSessionEntity> {
    return this.repo.save(session);
  }

  getByHash(hash: string): Promise<UserSessionEntity | null> {
    return this.repo.findOne({
      where: [{ refresh_token_hash: hash }, { previous_refresh_token_hash: hash }],
      relations: ['user'],
    });
  }

  getById(id: string): Promise<UserSessionEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async updateOne(id: string, data: Partial<UserSessionEntity>): Promise<void> {
    await this.repo.update(id, data);
  }

  async updateMany(where: FindOptionsWhere<UserSessionEntity>, data: Partial<UserSessionEntity>): Promise<void> {
    await this.repo.update(where, data);
  }
}
