import { UserRoleEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserRoleRepository {
  constructor(@InjectRepository(UserRoleEntity) private readonly repo: Repository<UserRoleEntity>) {}

  create(data: Partial<UserRoleEntity>): UserRoleEntity {
    return this.repo.create(data);
  }

  save(userRole: UserRoleEntity): Promise<UserRoleEntity> {
    return this.repo.save(userRole);
  }

  findByUserAndRole(userId: string, roleId: string): Promise<UserRoleEntity | null> {
    return this.repo.findOne({ where: { user_id: userId, role_id: roleId }, relations: ['role'] });
  }

  findByUserId(userId: string): Promise<UserRoleEntity[]> {
    return this.repo.find({ where: { user_id: userId }, relations: ['role'] });
  }

  async deleteByUserAndRole(userId: string, roleId: string): Promise<void> {
    await this.repo.delete({ user_id: userId, role_id: roleId });
  }
}
