import { LogLevel } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { ACCESS_TOKEN_TTL, Environment, LlmActiveProvider } from './config.types';

export class ConfigDto {
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  @IsEnum(Environment)
  ENVIRONMENT: Environment;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number;

  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  LOG_LEVEL: LogLevel;

  @IsOptional() @IsString() APP_LANDING_URL: string;
  @IsOptional() @IsString() TRUST_PROXY?: string;
  @IsOptional() @IsString() ALLOWED_ORIGINS: string = 'http://localhost:3000,http://localhost:5173';

  @IsString() @IsNotEmpty() PG_URI: string;
  @IsString() @IsNotEmpty() MONGODB_URI: string;
  @IsString() @IsNotEmpty() REDIS_URI: string;

  @IsString() @IsNotEmpty() GOOGLE_CLIENT_ID: string;
  @IsString() @IsNotEmpty() GOOGLE_CLIENT_SECRET: string;

  @IsString() @IsNotEmpty() JWT_PRIVATE_KEY: string;
  @IsString() @IsNotEmpty() JWT_PUBLIC_KEY: string;
  @IsString() @IsNotEmpty() ACCESS_TOKEN_TTL: ACCESS_TOKEN_TTL;
  @IsInt() @Min(1) @IsNotEmpty() REFRESH_TTL_DAYS: number;
  @IsInt() @Min(1) @IsNotEmpty() ABSOLUTE_TTL_DAYS: number;
  @IsOptional() @IsInt() @Min(5) @Max(300) REFRESH_TOKEN_GRACE_PERIOD_SECONDS: number = 30;

  @IsString() @IsNotEmpty() GCP_PROJECT_ID: string;
  @IsString() @IsNotEmpty() GCP_BUCKET_NAME: string;
  @IsString() @IsNotEmpty() GCP_CLIENT_EMAIL: string;
  @IsString() @IsNotEmpty() GCP_PRIVATE_KEY: string;

  @IsUrl() @IsNotEmpty() MEDIA_BASE_URL: string;

  @IsInt() @Min(1) @IsNotEmpty() CACHE_DEFAULT_TTL: number;
  @IsString() @IsNotEmpty() REDIS_KEY_PREFIX: string;

  @IsOptional() @IsString() LLM_ACTIVE_PROVIDER: LlmActiveProvider = 'openai';
  @IsString() @IsNotEmpty() OPENAI_API_KEY: string;
  @IsOptional() @IsString() OPENAI_MODEL: string = 'gpt-4o-mini';
  @IsString() @IsNotEmpty() GEMINI_API_KEY: string;
  @IsOptional() @IsString() GEMINI_MODEL: string = 'gemini-1.5-flash';

  @IsOptional() @IsString() AI_COACH_ASSISTANT_NAME?: string;
  @IsOptional() @IsString() AI_COACH_ASSISTANT_TONE?: string;
  @IsOptional() @IsInt() AI_COACH_SESSION_TIMEOUT_MINUTES: number = 30;
  @IsOptional() @IsInt() AI_COACH_CONTEXT_MESSAGES: number = 20;

  // OTP Auth
  @IsString() @IsNotEmpty() OTP_HMAC_SECRET: string;
  @IsString() @IsNotEmpty() SMS_GATEWAY_URL: string;
  @IsOptional() @IsBoolean() OTP_DEV_MODE: boolean = false;
  @IsOptional() @IsString() OTP_DEV_FIXED_CODE?: string;
  @IsOptional() @IsInt() OTP_TTL_SECONDS: number = 120;
  @IsOptional() @IsInt() OTP_MAX_ATTEMPTS: number = 5;
  @IsOptional() @IsInt() OTP_RATE_LIMIT_MAX: number = 3;
  @IsOptional() @IsInt() OTP_RATE_LIMIT_WINDOW_SECONDS: number = 60;

  // Razorpay payment provider
  @IsString() @IsNotEmpty() RAZORPAY_KEY_ID: string;
  @IsString() @IsNotEmpty() RAZORPAY_KEY_SECRET: string;
  @IsString() @IsNotEmpty() RAZORPAY_WEBHOOK_SECRET: string;

  // Internal service-to-service auth (HMAC-SHA256)
  @IsString() @IsNotEmpty() INTERNAL_HMAC_SECRET: string;
  @IsOptional() @IsInt() @Min(30) @Max(900) INTERNAL_HMAC_REPLAY_WINDOW_SECONDS: number = 300;

  // Video analysis service
  @IsUrl() @IsNotEmpty() VIDEO_ANALYSIS_SVC_BASE_URL: string;
  @IsOptional() @IsInt() @Min(1000) VIDEO_ANALYSIS_SVC_TIMEOUT_MS: number = 30000;
  @IsOptional() @IsInt() @Min(5) VIDEO_ANALYSIS_RETRY_THRESHOLD_MINUTES: number = 30;
  @IsOptional() @IsInt() @Min(1) @Max(10) VIDEO_ANALYSIS_MAX_RETRY_ATTEMPTS: number = 3;
  @IsString() @IsNotEmpty() GCS_FRAMES_BUCKET_NAME: string;
  @IsOptional() @IsUrl() VIDEO_ANALYSIS_CALLBACK_URL?: string;

  // Feature flags
  @IsOptional() @IsBoolean() SPORT_LEADERBOARD_ENABLED: boolean = false;
}
