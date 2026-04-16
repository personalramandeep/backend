import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class GoogleAuthService {
  private GOOGLE_CLIENT_ID: string;
  private client: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.GOOGLE_CLIENT_ID = this.configService.get('GOOGLE_CLIENT_ID');
    this.client = new OAuth2Client(this.GOOGLE_CLIENT_ID);
  }

  async verifyIdToken(idToken: string) {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new UnauthorizedException('Invalid Google token');
    }

    return payload;
  }
}
