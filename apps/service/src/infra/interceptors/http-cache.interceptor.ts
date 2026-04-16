import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import { Request, Response } from 'express';
import { NEVER, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { HTTP_CACHE_TTL_KEY } from '../decorators/http-cache.decorator';

/**
 * Reads the @HttpCache(ttl) metadata set by the decorator and:
 *  1. Serializes the response body to JSON and computes an MD5 ETag.
 *  2. If the client sends `If-None-Match` matching the ETag → 304 Not Modified (no body).
 *  3. Otherwise → 200 with Cache-Control: private, max-age=<ttl> + ETag headers.
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const ttl = this.reflector.get<number | undefined>(HTTP_CACHE_TTL_KEY, ctx.getHandler());

    // No @HttpCache decorator on this handler
    if (ttl === undefined) return next.handle();

    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      switchMap((body): Observable<any> => {
        // already-sent responses (e.g. stream/file handlers)
        if (res.headersSent) return of(body);

        const etag = `"${createHash('md5')
          .update(JSON.stringify(body ?? ''))
          .digest('hex')}"`;

        const clientEtag = req.headers['if-none-match'];
        if (clientEtag && clientEtag === etag) {
          /** 304 response and closes the HTTP connection */
          res.status(HttpStatus.NOT_MODIFIED).end();

          /** prevent NestJS from attempting to send the response body a second time
           * (which would throw ERR_HTTP_HEADERS_SENT) */
          return NEVER;
        }

        res.setHeader('Cache-Control', `private, max-age=${ttl}`);
        res.setHeader('ETag', etag);
        return of(body);
      }),
    );
  }
}
