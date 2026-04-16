export enum Environment {
  LOCAL = 'local',
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
}

export type ACCESS_TOKEN_TTL = `${number}MINUTE` | `${number}HOUR` | `${number}DAY`;

export interface JwtConfig {
  privateKey: string;
  publicKey: string;
  accessTokenTtl: ACCESS_TOKEN_TTL;
  refreshTtlDays: number;
  absoluteTtlDays: number;
  gracePeriodSeconds: number;
}

export interface GcpConfig {
  projectId: string;
  bucketName: string;
  framesBucketName: string;
  clientEmail: string;
  privateKey: string;
}
export interface RedisConfig {
  uri: string;
  keyPrefix: string;
  cacheTtl: number;
}

export type LlmActiveProvider = 'openai' | 'gemini';

export interface LlmConfig {
  llmActiveProvider: LlmActiveProvider;
  openaiApiKey: string;
  openaiModel: string;
  geminiApiKey: string;
  geminiModel: string;
}

export type TrustProxyValue = boolean | number | string;
