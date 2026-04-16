import { EPaymentProvider } from '@app/common';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IPaymentProvider } from './payment-provider.interface';

@Injectable()
export class PaymentProviderRegistry {
  private readonly providers = new Map<EPaymentProvider, IPaymentProvider>();

  register(provider: IPaymentProvider): void {
    this.providers.set(provider.providerName, provider);
  }

  resolve(name: EPaymentProvider): IPaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new InternalServerErrorException(`Payment provider '${name}' is not registered`);
    }
    return provider;
  }
}
