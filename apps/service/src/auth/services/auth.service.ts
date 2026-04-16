import { EUserAccountStatus, EUserGender, UserEntity } from '@app/common';
import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthorizationService } from '../../authorization/services/authorization.service';
import { ConfigService } from '../../config/config.service';
import { ReferralService } from '../../referral/referral.service';
import { StorageService } from '../../storage/storage.service';
import { UserService } from '../../user/services/user.service';
import { IAuthenticatedUser, IAuthResponse, ISessionMeta } from '../auth.types';
import { IAuthProviderStrategy, IProviderIdentity } from '../providers/auth-provider.strategy';
import { AuthProviderRepository } from '../repositories/auth-provider.repository';
import { AuthCacheService } from './auth-cache.service';
import { CryptoService } from './crypto.service';
import { JtiBlocklistService } from './jti-blocklist.service';
import { JWTService } from './jwt.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authProviderRepository: AuthProviderRepository,
    private readonly jwtService: JWTService,
    private readonly userService: UserService,
    private readonly cryptoService: CryptoService,
    private readonly sessionService: SessionService,
    private readonly authorizationService: AuthorizationService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
    private readonly jtiBlocklist: JtiBlocklistService,
    private readonly authCacheService: AuthCacheService,
    private readonly referralService: ReferralService,
  ) {}

  /**
   * Single provider-agnostic login entry point.
   * Delegates credential verification to the strategy
   * then resolves/creates the user
   * and issues a session — identical flow for every provider.
   *
   * @param strategy    Concrete provider (GoogleAuthProvider, PhoneOtpProvider, …)
   * @param credentials Provider-specific inputs
   * @param meta        HTTP request metadata
   * @param options     Optional role preference + timezone for new users
   */
  async loginWithProvider(
    strategy: IAuthProviderStrategy,
    credentials: unknown[],
    meta: ISessionMeta,
    options?: { timezone?: string; referralCode?: string },
  ): Promise<IAuthResponse> {
    const identity = await strategy.authenticate(...credentials);
    const user = await this.findOrCreateUser(identity, options);
    return this.login(user, meta);
  }

  async login(user: UserEntity, meta: ISessionMeta): Promise<IAuthResponse> {
    const { user: preparedUser, auth } = await this.authorizationService.prepareAuthContext(user);

    const refreshToken = this.cryptoService.generateRefreshToken();
    const hash = this.cryptoService.hash(refreshToken);

    const { sliding, absolute } = this.sessionService.calculateExpiry();

    const session = await this.sessionService.create({
      user_id: user.id,
      refresh_token_hash: hash,
      expires_at: sliding,
      absolute_expires_at: absolute,
      device_info: meta.deviceInfo,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
    });

    const accessToken = await this.jwtService.signAccessToken({
      userId: preparedUser.id,
      sessionId: session.id,
      tokenVersion: preparedUser.token_version,
    });

    return {
      accessToken,
      refreshToken,
      auth,
    };
  }

  async refresh(oldToken: string): Promise<IAuthResponse> {
    const hash = this.cryptoService.hash(oldToken);
    let session = await this.sessionService.findValidByHash(hash);

    if (!session) throw new UnauthorizedException();

    const newToken = this.cryptoService.generateRefreshToken();
    const newHash = this.cryptoService.hash(newToken);
    session = await this.sessionService.rotate({ session, newHash });

    const { user, auth } = await this.authorizationService.prepareAuthContext(session.user);
    const accessToken = await this.jwtService.signAccessToken({
      userId: user.id,
      sessionId: session.id,
      tokenVersion: user.token_version,
    });

    return {
      accessToken,
      refreshToken: newToken,
      auth,
    };
  }

  async logout(refreshToken?: string, accessToken?: string): Promise<void> {
    if (!refreshToken) return;

    const hash = this.cryptoService.hash(refreshToken);
    const session = await this.sessionService.getByHash(hash);

    if (!session || session.revoked_at) return;

    await this.sessionService.revoke(session);
    await this.authCacheService.invalidateSession(session.id);

    if (accessToken) {
      try {
        const decoded = await this.jwtService.verify(accessToken);
        if (decoded.jti) {
          const ttlSeconds = this.jwtService.parseTtlToSeconds(
            this.configService.jwtConfig.accessTokenTtl,
          );
          await this.jtiBlocklist.block(decoded.jti, ttlSeconds);
        }
      } catch {
        // Token may already be expired — no need to blocklist an expired token
      }
    }
  }

  async authenticate(token: string): Promise<IAuthenticatedUser> {
    if (!token) throw new UnauthorizedException('Missing token');

    const decoded = await this.jwtService.verify(token);

    if (!decoded?.sub || !decoded?.sid || decoded?.tv == null) {
      throw new UnauthorizedException('Invalid token or expired token');
    }

    if (decoded.jti && (await this.jtiBlocklist.isBlocked(decoded.jti))) {
      throw new UnauthorizedException('Token has been revoked');
    }

    let cachedUser = await this.authCacheService.getSession(decoded.sid);

    if (!cachedUser) {
      const user = await this.userService.findByIdWithRoles(decoded.sub);

      if (!user || user.account_status !== EUserAccountStatus.ACTIVE) {
        throw new BadRequestException('User not found or account is not active');
      }

      if (user.token_version !== decoded.tv) {
        throw new UnauthorizedException('Token version mismatch');
      }

      await this.sessionService.validateSession(decoded.sid, user.id);

      const ensuredUser = await this.authorizationService.ensureDefaultRole(user);
      const roleNames = this.authorizationService.getRoleNames(ensuredUser);

      const ttl = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 0;
      cachedUser = { ...ensuredUser, sessionId: decoded.sid, roleNames };

      if (ttl > 0) {
        await this.authCacheService.setSession(decoded.sid, cachedUser, ttl);
      }
    } else if (cachedUser.token_version !== decoded.tv) {
      throw new UnauthorizedException('Token version mismatch');
    }

    return cachedUser;
  }

  private async findOrCreateUser(
    identity: IProviderIdentity,
    options?: { timezone?: string; referralCode?: string },
  ): Promise<UserEntity> {
    const timezone = options?.timezone;
    const existingProvider = await this.authProviderRepository.getByProviderAndProviderUserId(
      identity.provider,
      identity.providerUserId,
    );

    if (existingProvider) {
      return existingProvider.user;
    }

    // Account linking by email
    let user: UserEntity | null = null;
    if (identity.email) {
      user = await this.userService.findByEmail(identity.email);
    }

    // Account linking by phone
    if (!user && identity.phone) {
      user = await this.userService.findByPhone(identity.phone);
    }

    if (!user) {
      const isPhoneOnly = !identity.email && !!identity.phone;

      user = await this.userService.create({
        email: identity.email ?? null,
        phone_number: identity.phone ?? null,
        full_name: identity.displayName ?? '',
        profile_pic_url: null,
        username: this.generateUsername(identity.email ?? identity.phone ?? ''),
        gender: EUserGender.NOT_SPECIFIED,
        timezone,
      });

      // TODO: use event
      if (!isPhoneOnly && identity.avatarUrl) {
        void this._downloadAndUploadProfilePic(identity.avatarUrl).then((url) => {
          if (url) void this.userService.updateProfile(user!.id, { profile_pic_url: url });
        });
      }

      void this.referralService.applyReferral(user.id, options?.referralCode).catch((err) => {
        this.logger.error('Failed to apply referral silently', err);
      });
    }

    await this.authProviderRepository.upsertProvider({
      user_id: user.id,
      provider: identity.provider,
      provider_user_id: identity.providerUserId,
      provider_email: identity.email ?? null,
      phone_number: identity.phone ?? null,
      is_verified: identity.isVerified,
      metadata: identity.rawMetadata ?? null,
    });

    return user;
  }

  private async _downloadAndUploadProfilePic(pictureUrl: string): Promise<string | null> {
    try {
      const response = await fetch(pictureUrl);
      if (!response.ok) return null;

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.split('/')[1] || 'jpg';

      return await this.storageService.uploadBuffer('profile-pics', buffer, contentType, ext);
    } catch (err) {
      this.logger.warn('Failed to download profile picture', { message: (err as Error).message });
      return null;
    }
  }

  // TODO: update logic (phone_number/email should not be exposed)
  private generateUsername(emailOrPhone: string): string {
    const base =
      emailOrPhone
        .split('@')[0]
        .replace(/[^a-zA-Z0-9_]/g, '')
        .slice(0, 12) || 'user';
    const random = Math.floor(Math.random() * 10000);
    return `${base}${random}`;
  }
}
