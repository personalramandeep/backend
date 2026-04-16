import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '../redis.constants';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject(REDIS_CLIENT) private readonly client: RedisClientType,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      const pong = await this.client.ping();

      if (pong !== 'PONG') {
        return indicator.down({ ping: pong });
      }

      return indicator.up({ ping: pong });
    } catch (err) {
      return indicator.down({ error: (err as Error).message });
    }
  }
}
