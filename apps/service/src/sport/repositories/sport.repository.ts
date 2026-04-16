import { SportEntity } from '@app/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, FindOptionsWhere, ILike, Repository } from 'typeorm';

export class SportRepository {
  constructor(@InjectRepository(SportEntity) private readonly repo: Repository<SportEntity>) {}

  create(data: Partial<SportEntity>) {
    return this.repo.create(data);
  }

  save(entity: SportEntity) {
    return this.repo.save(entity);
  }

  findActiveAllWithMetrics(): Promise<SportEntity[]> {
    return this.repo.find({
      where: { is_active: true },
      relations: ['metrics'],
      order: {
        name: 'ASC',
        metrics: { key: 'ASC' },
      },
    });
  }

  findAllWithMetrics(): Promise<SportEntity[]> {
    return this.repo.find({
      relations: ['metrics'],
      order: {
        name: 'ASC',
        metrics: { key: 'ASC' },
      },
    });
  }

  findActiveByIdOrSlugWithMetrics(sportIdOrSlug: string): Promise<SportEntity | null> {
    const where = this.buildIdOrSlugWhere(sportIdOrSlug, true);
    return this.repo.findOne({
      where,
      relations: ['metrics'],
      order: {
        metrics: { key: 'ASC' },
      },
    });
  }

  findByIdWithMetrics(id: string): Promise<SportEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['metrics'],
      order: {
        metrics: { key: 'ASC' },
      },
    });
  }

  findActiveByIds(ids: string[]): Promise<SportEntity[]> {
    if (!ids.length) {
      return Promise.resolve([]);
    }

    return this.repo.find({
      where: ids.map((id) => ({ id, is_active: true })),
      relations: ['metrics'],
      order: {
        name: 'ASC',
        metrics: { key: 'ASC' },
      },
    });
  }

  async findConflict(name: string, slug: string, ignoreId?: string): Promise<SportEntity | null> {
    const qb = this.repo.createQueryBuilder('sport').where(
      new Brackets((subQuery) => {
        subQuery
          .where('LOWER(sport.name) = LOWER(:name)', { name })
          .orWhere('LOWER(sport.slug) = LOWER(:slug)', { slug });
      }),
    );

    if (ignoreId) {
      qb.andWhere('sport.id != :ignoreId', { ignoreId });
    }

    return qb.getOne();
  }

  async existsActiveById(id: string): Promise<boolean> {
    return this.repo.exists({ where: { id, is_active: true } });
  }

  private buildIdOrSlugWhere(sportIdOrSlug: string, activeOnly: boolean): FindOptionsWhere<SportEntity>[] {
    const slugWhere: FindOptionsWhere<SportEntity> = activeOnly
      ? { slug: ILike(sportIdOrSlug), is_active: true }
      : { slug: ILike(sportIdOrSlug) };

    if (!this.isUuid(sportIdOrSlug)) {
      return [slugWhere];
    }

    const idWhere: FindOptionsWhere<SportEntity> = activeOnly
      ? { id: sportIdOrSlug, is_active: true }
      : { id: sportIdOrSlug };

    return [idWhere, slugWhere];
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
