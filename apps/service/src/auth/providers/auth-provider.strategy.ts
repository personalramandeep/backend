import { EAuthProvider } from '@app/common';

export interface IProviderIdentity {
  provider: EAuthProvider;
  providerUserId: string; // sub for Google/Apple, e164 phone for OTP, email for local
  email?: string | null;
  phone?: string | null;
  isVerified: boolean;
  displayName?: string | null;
  avatarUrl?: string | null;
  rawMetadata?: Record<string, any> | null;
}

/**
 * Every auth provider (Google, PhoneOTP, Apple, …) must implement this.
 * The `credential` shape is provider-specific; providers define their own
 * input DTOs and call authenticate() internally.
 */
export interface IAuthProviderStrategy {
  authenticate(...args: any[]): Promise<IProviderIdentity>;
}
