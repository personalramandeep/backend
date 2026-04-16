import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  MongooseHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Public()
@Controller('/')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly mongo: MongooseHealthIndicator,
    private readonly http: HttpHealthIndicator,
  ) {}

  @Get('/')
  getHello() {
    return { message: 'Hello World!' };
  }

  @Get('/health')
  @HealthCheck()
  @ApiOperation({ summary: 'Application health check' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('postgres'),
      () => this.mongo.pingCheck('mongodb'),
    ]);
  }
}
