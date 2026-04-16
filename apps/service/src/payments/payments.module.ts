import { PaymentOrderEntity, PaymentTransactionEntity } from '@app/common';
import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { PaymentsService } from './payments.service';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';
import { RazorpayProvider } from './providers/razorpay.provider';
import { PaymentOrderRepository } from './repositories/payment-order.repository';
import { PaymentTransactionRepository } from './repositories/payment-transaction.repository';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([PaymentOrderEntity, PaymentTransactionEntity])],
  providers: [
    PaymentsService,
    PaymentOrderRepository,
    PaymentTransactionRepository,
    PaymentProviderRegistry,
    RazorpayProvider,
  ],
  exports: [PaymentsService, PaymentProviderRegistry],
})
export class PaymentsModule implements OnModuleInit {
  constructor(
    private readonly registry: PaymentProviderRegistry,
    private readonly razorpayProvider: RazorpayProvider,
  ) {}

  onModuleInit() {
    this.registry.register(this.razorpayProvider);
  }
}
