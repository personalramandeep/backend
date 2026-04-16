import { SetMetadata } from '@nestjs/common';

export const HTTP_CACHE_TTL_KEY = 'http_cache_ttl';

/**
 * Attach to a route handler to opt it into HTTP response caching.
 *
 * The HttpCacheInterceptor will:
 *  1. Compute an ETag (MD5) from the serialized response body.
 *  2. Return 304 Not Modified when the client sends a matching If-None-Match.
 *  3. Otherwise emit Cache-Control: private, max-age=<ttlSeconds> and ETag headers.
 *
 * @example
 * @Get('/stats')
 * @HttpCache(30)
 * getStats() { ... }
 */
export const HttpCache = (ttlSeconds: number) => SetMetadata(HTTP_CACHE_TTL_KEY, ttlSeconds);
