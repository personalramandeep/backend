import { Injectable, LogLevel } from '@nestjs/common';
import * as config from '@nestjs/config';
import { ConfigDto } from './config.dto';
import {
  Environment,
  GcpConfig,
  JwtConfig,
  LlmConfig,
  RedisConfig,
  TrustProxyValue,
} from './config.types';

@Injectable()
export class ConfigService {
  readonly isLocal: boolean;
  readonly isDevelopment: boolean;
  readonly isProduction: boolean;
  readonly logLevel: LogLevel;

  constructor(private readonly configService: config.ConfigService<ConfigDto, true>) {
    this.isLocal = this.get('ENVIRONMENT') === Environment.LOCAL;
    this.isDevelopment = this.get('ENVIRONMENT') === Environment.DEVELOPMENT;
    this.isProduction = this.get('ENVIRONMENT') === Environment.PRODUCTION;
    this.logLevel = this.get('LOG_LEVEL');
  }

  get<T extends keyof ConfigDto>(key: T): ConfigDto[T] {
    return this.configService.get(key, { infer: true });
  }

  getOrThrow<T extends keyof ConfigDto>(key: T): ConfigDto[T] {
    return this.configService.getOrThrow(key, { infer: true });
  }

  get jwtConfig(): JwtConfig {
    return {
      publicKey: this.get('JWT_PUBLIC_KEY').replace(/\\n/g, '\n'),
      privateKey: this.get('JWT_PRIVATE_KEY').replace(/\\n/g, '\n'),
      accessTokenTtl: this.get('ACCESS_TOKEN_TTL'),
      refreshTtlDays: this.get('REFRESH_TTL_DAYS'),
      absoluteTtlDays: this.get('ABSOLUTE_TTL_DAYS'),
      gracePeriodSeconds: this.get('REFRESH_TOKEN_GRACE_PERIOD_SECONDS'),
    };
  }

  get allowedOrigins(): string[] {
    const raw = this.get('ALLOWED_ORIGINS');
    return raw ? raw.split(',').map((s) => s.trim()) : [];
  }

  get trustProxy(): TrustProxyValue {
    const rawValue = this.get('TRUST_PROXY');

    if (!rawValue) {
      return false;
    }

    const normalized = rawValue.toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
    if (/^\d+$/.test(rawValue)) {
      return Number(rawValue);
    }

    return rawValue;
  }

  get gcpConfig(): GcpConfig {
    return {
      projectId: this.get('GCP_PROJECT_ID'),
      bucketName: this.get('GCP_BUCKET_NAME'),
      framesBucketName: this.get('GCS_FRAMES_BUCKET_NAME'),
      clientEmail: this.get('GCP_CLIENT_EMAIL'),
      privateKey: this.get('GCP_PRIVATE_KEY').replace(/\\n/g, '\n'),
    };
  }

  get redisConfig(): RedisConfig {
    return {
      uri: this.get('REDIS_URI'),
      keyPrefix: this.get('REDIS_KEY_PREFIX'),
      cacheTtl: this.get('CACHE_DEFAULT_TTL'),
    };
  }

  get llmConfig(): LlmConfig {
    return {
      llmActiveProvider: this.get('LLM_ACTIVE_PROVIDER') ?? 'openai',
      openaiApiKey: this.get('OPENAI_API_KEY'),
      openaiModel: this.get('OPENAI_MODEL'),
      geminiApiKey: this.get('GEMINI_API_KEY') ?? '',
      geminiModel: this.get('GEMINI_MODEL'),
    };
  }

  get otpConfig() {
    return {
      hmacSecret: this.get('OTP_HMAC_SECRET'),
      smsGatewayUrl: this.get('SMS_GATEWAY_URL'),
      ttlSeconds: this.get('OTP_TTL_SECONDS'),
      maxAttempts: this.get('OTP_MAX_ATTEMPTS'),
      rateLimitMax: this.get('OTP_RATE_LIMIT_MAX'),
      rateLimitWindowSeconds: this.get('OTP_RATE_LIMIT_WINDOW_SECONDS'),
      devMode: !this.isProduction && !!this.get('OTP_DEV_MODE'),
      devFixedCode: this.get('OTP_DEV_FIXED_CODE') ?? null,
    };
  }

  get videoAnalysisSvcConfig() {
    return {
      baseUrl: this.get('VIDEO_ANALYSIS_SVC_BASE_URL'),
      timeoutMs: this.get('VIDEO_ANALYSIS_SVC_TIMEOUT_MS') ?? 30000,
      retryThresholdMinutes: this.get('VIDEO_ANALYSIS_RETRY_THRESHOLD_MINUTES') ?? 30,
      maxRetryAttempts: this.get('VIDEO_ANALYSIS_MAX_RETRY_ATTEMPTS') ?? 3,
      callbackUrl: this.get('VIDEO_ANALYSIS_CALLBACK_URL') ?? null,
    };
  }

  get internalHmacConfig() {
    return {
      secret: this.get('INTERNAL_HMAC_SECRET'),
      replayWindowSeconds: this.get('INTERNAL_HMAC_REPLAY_WINDOW_SECONDS') ?? 300,
    };
  }

  get sportLeaderboardEnabled(): boolean {
    return this.get('SPORT_LEADERBOARD_ENABLED') !== false;
  }
}
