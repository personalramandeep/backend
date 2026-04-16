import { Module } from '@nestjs/common';
import { AdminBillingModule } from './billing/admin-billing.module';

@Module({
  imports: [AdminBillingModule],
})
export class AdminModule {}
