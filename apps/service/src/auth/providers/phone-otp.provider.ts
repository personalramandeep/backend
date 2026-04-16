import { EAuthProvider } from '@app/common';
import { BadRequestException, Injectable } from '@nestjs/common';
import { parsePhoneNumberWithError } from 'libphonenumber-js';
import { OtpService } from '../services/otp.service';
import { IAuthProviderStrategy, IProviderIdentity } from './auth-provider.strategy';

@Injectable()
export class PhoneOtpProvider implements IAuthProviderStrategy {
  constructor(private readonly otpService: OtpService) {}

  async authenticate(phone: string, otp: string): Promise<IProviderIdentity> {
    await this.otpService.verifyOtp(phone, otp);

    return {
      provider: EAuthProvider.OTP,
      providerUserId: phone,
      email: null,
      phone,
      isVerified: true,
      displayName: null,
      avatarUrl: null,
      rawMetadata: null,
    };
  }

  async sendOtp(phone: string): Promise<{ expiresIn: number }> {
    const parsed = parsePhoneNumberWithError(phone);

    if (!parsed?.isValid()) {
      throw new BadRequestException({
        message: 'Invalid phone number format. Use E.164 e.g. +918888888888',
        code: 'INVALID_PHONE',
      });
    }

    return this.otpService.sendOtp(parsed.format('E.164'));
  }
}
