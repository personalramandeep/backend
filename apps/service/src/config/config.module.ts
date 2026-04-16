import { Module } from '@nestjs/common';
import * as config from '@nestjs/config';
import { ConfigService } from './config.service';
import { validateConfig } from './config.validation';

@Module({
  imports: [
    config.ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: false,
      validate: validateConfig,
      envFilePath: ['apps/service/.env'],
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
