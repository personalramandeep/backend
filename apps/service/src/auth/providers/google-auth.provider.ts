import { EAuthProvider } from '@app/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '../../config/config.service';
import { IAuthProviderStrategy, IProviderIdentity } from './auth-provider.strategy';

@Injectable()
export class GoogleAuthProvider implements IAuthProviderStrategy {
  private readonly GOOGLE_CLIENT_ID: string;
  private readonly client: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.GOOGLE_CLIENT_ID = this.configService.get('GOOGLE_CLIENT_ID');
    this.client = new OAuth2Client(this.GOOGLE_CLIENT_ID);
  }

  async authenticate(idToken: string): Promise<IProviderIdentity> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const { sub, email, email_verified, name, given_name, family_name, picture } = payload;

    if (!sub || !email) {
      throw new UnauthorizedException('Invalid Google payload: missing sub or email');
    }

    return {
      provider: EAuthProvider.GOOGLE,
      providerUserId: sub,
      email: email.toLowerCase(),
      phone: null,
      isVerified: email_verified ?? false,
      displayName: name || [given_name, family_name].filter(Boolean).join(' ') || null,
      avatarUrl: picture ?? null,
      rawMetadata: payload,
    };
  }
}
