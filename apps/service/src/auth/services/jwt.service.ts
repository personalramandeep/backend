import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { ACCESS_TOKEN_TTL } from '../../config/config.types';
import { IUserTokenPayload } from '../auth.types';

@Injectable()
export class JWTService {
  constructor(private readonly jwtService: JwtService) {}

  async signAccessToken(payload: {
    userId: string;
    sessionId: string;
    tokenVersion: number;
  }): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: payload.userId,
        sid: payload.sessionId,
        tv: payload.tokenVersion,
      },
      {
        jwtid: randomUUID(),
      },
    );
  }

  async verify(token: string): Promise<IUserTokenPayload> {
    return this.jwtService.verifyAsync<IUserTokenPayload>(token);
  }

  parseTtlToSeconds(ttl: ACCESS_TOKEN_TTL): number {
    const match = ttl.match(/^(\d+)(MINUTE|HOUR|DAY)$/);
    if (!match) throw new Error(`Invalid ACCESS_TOKEN_TTL format: ${ttl}`);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === 'MINUTE') return value * 60;
    if (unit === 'HOUR') return value * 3600;
    return value * 86400; // DAY
  }
}
