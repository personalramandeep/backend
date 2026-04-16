import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { UAParser } from 'ua-parser-js';
import { ISessionMeta } from '../auth.types';

@Injectable()
export class SessionMetaService {
  build(req: Request): ISessionMeta {
    const userAgent = req.headers['user-agent'];
    return {
      ipAddress: this.normalizeIp(req.ip),
      userAgent,
      deviceInfo: this.parseDevice(userAgent),
      deviceId: req.headers['x-device-id'] as string,
    };
  }

  private parseDevice(userAgent?: string): string {
    const parser = new UAParser(userAgent);
    const device = parser.getDevice();
    const os = parser.getOS();
    return `${device.type || 'desktop'} - ${os.name || 'unknown'}`;
  }

  private normalizeIp(ip?: string): string | undefined {
    if (!ip) {
      return undefined;
    }

    const trimmed = ip.trim();
    if (!trimmed) {
      return undefined;
    }

    // Express may return IPv4-mapped addresses like ::ffff:127.0.0.1.
    if (trimmed.startsWith('::ffff:')) {
      return trimmed.replace('::ffff:', '');
    }

    return trimmed;
  }
}
