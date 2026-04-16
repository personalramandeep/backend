import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const RefreshToken = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();

    const cookieToken = request.cookies?.refresh_token as string;
    if (cookieToken) return cookieToken;

    return request.headers['x-refresh-token'] as string;
  },
);
