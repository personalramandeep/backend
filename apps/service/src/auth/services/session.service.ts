import { UserSessionEntity } from '@app/common';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { IsNull } from 'typeorm';
import { ConfigService } from '../../config/config.service';
import { SessionRepository } from '../repositories/session.repository';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly sessionRepository: SessionRepository,
  ) {}

  private assertNotExpired(session: UserSessionEntity): void {
    const now = DateTime.utc();

    if (session.revoked_at) {
      throw new UnauthorizedException('Session revoked');
    }

    if (DateTime.fromJSDate(session.expires_at).toUTC() < now) {
      throw new UnauthorizedException('Sliding expiration passed');
    }

    if (DateTime.fromJSDate(session.absolute_expires_at).toUTC() < now) {
      throw new UnauthorizedException('Absolute expiration passed');
    }
  }

  async create(data: Partial<UserSessionEntity>) {
    return this.sessionRepository.save(this.sessionRepository.create(data));
  }

  async findValidByHash(hash: string) {
    const session = await this.sessionRepository.getByHash(hash);

    if (!session) return null;

    this.assertNotExpired(session);

    if (session.previous_refresh_token_hash === hash) {
      if (
        session.previous_refresh_token_expiry &&
        DateTime.fromJSDate(session.previous_refresh_token_expiry).toUTC() < DateTime.utc()
      ) {
        await this.revoke(session);
        this.logger.warn('SECURITY: Refresh token reuse outside grace period detected. Session revoked.', {
          sessionId: session.id,
          userId: session.user_id,
        });
        throw new UnauthorizedException('Token reuse detected. Session revoked.');
      }
    }

    return session;
  }

  async getByHash(hash: string): Promise<UserSessionEntity | null> {
    return this.sessionRepository.getByHash(hash);
  }

  async validateSession(sessionId: string, userId: string): Promise<UserSessionEntity> {
    const session = await this.sessionRepository.getById(sessionId);

    if (!session || session.user_id !== userId) {
      throw new UnauthorizedException('Invalid session');
    }

    this.assertNotExpired(session);

    return session;
  }

  async rotate(data: { session: UserSessionEntity; newHash: string }): Promise<UserSessionEntity> {
    const { session, newHash } = data;
    const { sliding } = this.calculateExpiry();
    const { gracePeriodSeconds } = this.configService.jwtConfig;

    session.previous_refresh_token_hash = session.refresh_token_hash;
    session.previous_refresh_token_expiry = DateTime.utc().plus({ seconds: gracePeriodSeconds }).toJSDate();

    session.refresh_token_hash = newHash;
    session.expires_at = sliding;
    session.last_used_at = DateTime.utc().toJSDate();
    session.rotation_counter += 1;

    await this.sessionRepository.save(session);

    return session;
  }

  async revoke(session: UserSessionEntity): Promise<void> {
    await this.sessionRepository.updateOne(session.id, { revoked_at: DateTime.utc().toJSDate() });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.sessionRepository.updateMany(
      { user_id: userId, revoked_at: IsNull() },
      { revoked_at: DateTime.utc().toJSDate() },
    );
  }

  calculateExpiry(): { sliding: Date; absolute: Date } {
    const { refreshTtlDays, absoluteTtlDays } = this.configService.jwtConfig;
    const now = DateTime.utc();

    const sliding = now.plus({ days: refreshTtlDays }).toJSDate();
    const absolute = now.plus({ days: absoluteTtlDays }).toJSDate();

    return { sliding, absolute };
  }
}
