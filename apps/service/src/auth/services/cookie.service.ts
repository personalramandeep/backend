import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class CookieService {
  constructor(private readonly configService: ConfigService) {}

  setRefreshToken(res: Response, token: string): void {
    const maxAgeMs = this.configService.jwtConfig.refreshTtlDays * 24 * 60 * 60 * 1000;

    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: this.configService.isProduction,
      sameSite: 'lax',
      path: '/auth',
      maxAge: maxAgeMs,
    });
  }

  clearRefreshToken(res: Response): void {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.configService.isProduction,
      sameSite: 'lax',
      path: '/auth',
    });
  }
}
