import { CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, of, switchMap } from 'rxjs';
import { CacheKeyBuilder } from './cache-key.builder';
import { CacheService } from './cache.service';

export const HTTP_CACHE_TTL_KEY = 'httpCacheTtl';
export const HttpCacheTtl = (ttl: number) => SetMetadata(HTTP_CACHE_TTL_KEY, ttl);

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly keyBuilder: CacheKeyBuilder,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.method !== 'GET') return next.handle();

    const ttl = this.reflector.get<number>(HTTP_CACHE_TTL_KEY, context.getHandler());
    if (ttl === undefined) return next.handle();

    const cacheKey = this.keyBuilder.buildExact('http', request.url);

    const cached = await this.cacheService.get(cacheKey);
    if (cached !== null) return of(cached);

    return next.handle().pipe(
      switchMap(async (response: unknown) => {
        await this.cacheService.set(cacheKey, response, ttl);
        return response;
      }),
    );
  }
}
