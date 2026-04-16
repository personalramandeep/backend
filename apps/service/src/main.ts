import { ConsoleLogger, Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const configService = app.get(ConfigService);

  app.enableCors({ origin: configService.allowedOrigins, credentials: true });

  app.useLogger(
    new ConsoleLogger({
      logLevels: [configService.get('LOG_LEVEL')],
      json: !configService.isLocal,
      colors: !configService.isProduction,
      compact: true,
    }),
  );

  app.set('trust proxy', configService.trustProxy);
  app.enableVersioning({ type: VersioningType.URI });
  app.enableShutdownHooks();

  app.use(helmet());
  app.use(morgan(configService.isProduction ? 'combined' : 'dev'));
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '10mb' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Documentation')
    .setDescription('APIs')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .setVersion('1.0')
    .build();

  SwaggerModule.setup('/docs', app, SwaggerModule.createDocument(app, swaggerConfig), {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  const PORT = +configService.get('PORT') || 3000;

  await app.listen(PORT);
  Logger.log('🚀🚀 service is up and running 🚀🚀');
}

void bootstrap();
