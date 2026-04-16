import { Inject } from '@nestjs/common';
import { CacheKeyBuilder } from './cache-key.builder';
import { CacheService } from './cache.service';

export interface CacheableOptions {
  /** Namespace for key grouping, defaults to class.method */
  namespace?: string;
  /** TTL in seconds, defaults to CACHE_DEFAULT_TTL */
  ttl?: number;
  /** Custom key resolver — receives method arguments */
  keyResolver?: (...args: unknown[]) => string;
}

export function Cacheable(options: CacheableOptions = {}): MethodDecorator {
  const injectCacheService = Inject(CacheService);
  const injectKeyBuilder = Inject(CacheKeyBuilder);

  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // Inject dependencies into the class prototype
    injectCacheService(target, '__cacheService');
    injectKeyBuilder(target, '__cacheKeyBuilder');

    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    descriptor.value = async function (this: Record<string, unknown>, ...args: unknown[]) {
      const cacheService = this.__cacheService as CacheService;
      const keyBuilder = this.__cacheKeyBuilder as CacheKeyBuilder;

      const namespace = options.namespace ?? `${target.constructor.name}.${String(propertyKey)}`;

      const cacheKey = options.keyResolver
        ? keyBuilder.buildExact(namespace, options.keyResolver(...args))
        : keyBuilder.build(namespace, ...args);

      const cached = await cacheService.get(cacheKey);
      if (cached !== null) return cached;

      const result: unknown = await originalMethod.apply(this, args);
      await cacheService.set(cacheKey, result, options.ttl);
      return result;
    };

    return descriptor;
  };
}
