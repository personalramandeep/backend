import { ERole, UserEntity } from '@app/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, FindOptionsWhere, In, Repository } from 'typeorm';

export interface PaginateUsersOpts {
  page?: number;
  limit?: number;
  search?: string;
  role?: ERole;
  sortBy?: 'created_at' | 'full_name' | 'last_login_at';
  sortOrder?: 'ASC' | 'DESC';
}

export class UserRepository {
  constructor(@InjectRepository(UserEntity) private readonly repo: Repository<UserEntity>) {}

  create(data: Partial<UserEntity>): UserEntity {
    return this.repo.create(data);
  }

  save(user: UserEntity): Promise<UserEntity> {
    return this.repo.save(user);
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIds(ids: string[]): Promise<UserEntity[]> {
    if (!ids.length) return Promise.resolve([]);
    return this.repo.findBy({ id: In(ids) });
  }

  findByIdWithRoles(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['roles', 'roles.role', 'player_profile'],
    });
  }

  async findOne(where: FindOptionsWhere<UserEntity>) {
    return this.repo.findOne({ where });
  }

  async updateOne(id: string, data: Partial<UserEntity>): Promise<void> {
    await this.repo.update(id, data);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async incrementTokenVersion(id: string): Promise<void> {
    await this.repo.increment({ id }, 'token_version', 1);
  }

  async usernameExists(username: string): Promise<boolean> {
    return this.repo.exists({
      where: { username: username.toLowerCase() },
    });
  }

  async emailExists(email: string): Promise<boolean> {
    return this.repo.exists({
      where: { email: email.toLowerCase() },
    });
  }

  async phoneExists(phone_number: string): Promise<boolean> {
    return this.repo.exists({
      where: { phone_number },
    });
  }

  async findByUsername(username: string) {
    return this.repo.findOne({
      where: { username: username.toLowerCase() },
    });
  }

  async findByEmail(email: string) {
    return this.repo.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async findByPhone(phone_number: string) {
    return this.repo.findOne({
      where: { phone_number },
    });
  }

  async paginate(opts: PaginateUsersOpts = {}) {
    const { page = 1, limit = 20, search, role, sortBy = 'created_at', sortOrder = 'DESC' } = opts;

    const qb = this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role');

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((wb) => {
          wb.where('LOWER(user.full_name) LIKE :term', { term })
            .orWhere('LOWER(user.username) LIKE :term', { term })
            .orWhere('LOWER(user.email) LIKE :term', { term });
        }),
      );
    }

    if (role) {
      qb.andWhere('role.name = :role', { role });
    }

    const sortColumn =
      sortBy === 'full_name'
        ? 'user.full_name'
        : sortBy === 'last_login_at'
          ? 'user.last_login_at'
          : 'user.created_at';
    qb.orderBy(sortColumn, sortOrder);

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }
}
