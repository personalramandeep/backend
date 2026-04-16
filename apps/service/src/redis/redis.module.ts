import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { createClient, RedisClientOptions, RedisClientType } from 'redis';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { CacheKeyBuilder } from './cache/cache-key.builder';
import { HttpCacheInterceptor } from './cache/cache.interceptor';
import { CacheService } from './cache/cache.service';
import { RedisHealthIndicator } from './health/redis.health';
import { REDIS_CLIENT } from './redis.constants';

const logger = new Logger('RedisModule');

@Global()
@Module({
  imports: [ConfigModule, TerminusModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<RedisClientType> => {
        const config = configService.redisConfig;
        const clientOptions: RedisClientOptions = {
          url: config.uri,
          socket: {},
        };

        const client = createClient(clientOptions) as RedisClientType;

        client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
        client.on('connect', () => logger.log(`Redis connected`));
        client.on('reconnecting', () => logger.warn(`Redis reconnecting...`));

        await client.connect();
        return client;
      },
    },
    CacheService,
    CacheKeyBuilder,
    HttpCacheInterceptor,
    RedisHealthIndicator,
  ],
  exports: [
    REDIS_CLIENT,
    CacheService,
    CacheKeyBuilder,
    HttpCacheInterceptor,
    RedisHealthIndicator,
  ],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redisClient.quit();
  }
}
