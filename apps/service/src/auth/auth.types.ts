import { ERole, UserEntity } from '@app/common';

export interface IUserTokenPayload {
  sub: string;
  sid: string;
  tv: number;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface ISessionMeta {
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  deviceId?: string;
}

export interface IAuthenticatedUser extends UserEntity {
  sessionId: string;
  roleNames: ERole[];
}

export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  auth: {
    userId: string;
  };
}

export interface IResolvedAuthContext {
  user: UserEntity;
  auth: {
    userId: string;
  };
}
