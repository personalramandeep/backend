import { Global, Module } from '@nestjs/common';
import { TimezoneService } from './services/timezone.service';

@Global()
@Module({
  providers: [TimezoneService],
  exports: [TimezoneService],
})
export class UtilsModule {}
