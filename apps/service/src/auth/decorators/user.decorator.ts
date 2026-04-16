import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Socket } from 'socket.io';

export const User = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.user;
});

export const UserId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.user?.id;
});

export const UserRole = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.user?.roleNames?.[0];
});

export const WsUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const client = ctx.switchToWs().getClient<Socket>();
    return client.data?.user?.id as string | undefined;
  },
);
