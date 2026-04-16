import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class CacheKeyBuilder {
  private readonly prefix: string;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.redisConfig;
    this.prefix = config.keyPrefix;
  }

  build(namespace: string, ...parts: unknown[]): string {
    const raw = parts.map((p) => JSON.stringify(p)).join(':');
    const hash = createHash('sha1').update(raw).digest('hex').slice(0, 8);
    return `${this.prefix}cache:${namespace}:${hash}`;
  }

  buildExact(namespace: string, key: string): string {
    return `${this.prefix}cache:${namespace}:${key}`;
  }
}
