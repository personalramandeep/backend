import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class InternalHmacGuard implements CanActivate {
  private readonly logger = new Logger(InternalHmacGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RawBodyRequest<Request>>();

    const tsHeader = req.headers['x-timestamp'];
    const ts = parseInt((Array.isArray(tsHeader) ? tsHeader[0] : tsHeader) ?? '0', 10);
    const { secret, replayWindowSeconds } = this.configService.internalHmacConfig;

    // Replay prevention
    if (Math.abs(Date.now() / 1000 - ts) > replayWindowSeconds) {
      this.logger.warn('Internal request rejected: timestamp outside replay window');
      throw new UnauthorizedException('Request expired');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error('rawBody not available — check NestFactory rawBody: true');
      throw new UnauthorizedException('Raw body not available');
    }

    const sigHeader = req.headers['x-signature'];
    const received = ((Array.isArray(sigHeader) ? sigHeader[0] : sigHeader) ?? '').replace(
      'sha256=',
      '',
    );

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    // timing side-channel attack prevention
    let valid = false;
    try {
      valid = timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
    } catch {
      valid = false;
    }

    if (!valid) {
      this.logger.warn('Internal request rejected: invalid HMAC signature');
      throw new UnauthorizedException('Invalid signature');
    }

    return true;
  }
}
