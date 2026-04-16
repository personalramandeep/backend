import { AuthProviderEntity, EAuthProvider } from '@app/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface IUpsertProviderDTO {
  user_id: string;
  provider: EAuthProvider;
  provider_user_id: string;
  provider_email?: string | null;
  phone_number?: string | null;
  is_verified?: boolean;
  metadata?: Record<string, any> | null;
}

export class AuthProviderRepository {
  constructor(
    @InjectRepository(AuthProviderEntity) private readonly repo: Repository<AuthProviderEntity>,
  ) {}

  create(data: Partial<AuthProviderEntity>): AuthProviderEntity {
    return this.repo.create(data);
  }

  save(data: AuthProviderEntity): Promise<AuthProviderEntity> {
    return this.repo.save(data);
  }

  getByProviderAndProviderUserId(
    provider: EAuthProvider,
    providerUserId: string,
  ): Promise<AuthProviderEntity | null> {
    return this.repo.findOne({
      where: { provider, provider_user_id: providerUserId },
      relations: ['user'],
    });
  }

  /**
   * Idempotent upsert — links a provider record to a user.
   * Safe to call multiple times;
   * updates is_verified / metadata if the record already exists.
   */
  async upsertProvider(data: IUpsertProviderDTO): Promise<void> {
    await this.repo.upsert(
      {
        user_id: data.user_id,
        provider: data.provider,
        provider_user_id: data.provider_user_id,
        provider_email: data.provider_email ?? null,
        phone_number: data.phone_number ?? null,
        is_verified: data.is_verified ?? false,
        metadata: data.metadata ?? null,
      },
      { conflictPaths: ['provider', 'provider_user_id'] },
    );
  }

  findByPhone(phone_number: string): Promise<AuthProviderEntity | null> {
    return this.repo.findOne({
      where: { phone_number },
      relations: ['user'],
    });
  }
}
