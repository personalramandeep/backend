import { FavoriteTargetType, UserFavoriteEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(UserFavoriteEntity) private readonly repo: Repository<UserFavoriteEntity>,
  ) {}

  async toggle(
    userId: string,
    targetType: FavoriteTargetType,
    targetId: string,
  ): Promise<{ favorited: boolean }> {
    const insertResult = await this.repo
      .createQueryBuilder()
      .insert()
      .into(UserFavoriteEntity)
      .values({
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
      })
      .orIgnore()
      .execute();

    const inserted = insertResult.raw.length > 0;

    if (!inserted) {
      await this.repo.delete({
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
      });
      return { favorited: false };
    }

    return { favorited: true };
  }

  async listByType(
    userId: string,
    targetType: FavoriteTargetType,
    limit = 50,
    offset = 0,
  ): Promise<{ ids: string[]; total: number }> {
    const [rows, total] = await this.repo.findAndCount({
      where: { user_id: userId, target_type: targetType },
      select: ['target_id'],
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { ids: rows.map((r) => r.target_id), total };
  }

  async getFavoriteSet(
    userId: string,
    targetType: FavoriteTargetType,
    inIds?: string[],
  ): Promise<Set<string>> {
    const qb = this.repo
      .createQueryBuilder('f')
      .select('f.target_id')
      .where('f.user_id = :userId AND f.target_type = :targetType', { userId, targetType });

    if (inIds && inIds.length > 0) {
      qb.andWhere('f.target_id IN (:...inIds)', { inIds });
    }

    const rows = await qb.getMany();
    return new Set(rows.map((r) => r.target_id));
  }

  async isFavorited(
    userId: string,
    targetType: FavoriteTargetType,
    targetId: string,
  ): Promise<boolean> {
    const count = await this.repo.count({
      where: { user_id: userId, target_type: targetType, target_id: targetId },
    });
    return count > 0;
  }
}
