import { ERole, RoleEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

@Injectable()
export class RoleRepository {
  constructor(@InjectRepository(RoleEntity) private readonly repo: Repository<RoleEntity>) {}

  findAll(): Promise<RoleEntity[]> {
    return this.repo.find();
  }

  findByName(name: ERole): Promise<RoleEntity | null> {
    return this.repo.findOne({ where: { name } });
  }

  findByNames(names: ERole[]): Promise<RoleEntity[]> {
    return this.repo.find({ where: { name: In(names) } });
  }

  create(data: Partial<RoleEntity>): RoleEntity {
    return this.repo.create(data);
  }

  save(role: RoleEntity): Promise<RoleEntity> {
    return this.repo.save(role);
  }
}
