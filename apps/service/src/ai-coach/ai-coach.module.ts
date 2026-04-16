import {
  AiCoachMessageEntity,
  AiCoachMessageSchema,
  AiCoachSessionEntity,
  AiCoachSessionSchema,
} from '@app/common';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '../config/config.module';
import { AiCoachController } from './ai-coach.controller';
import { AiCoachGateway } from './ai-coach.gateway';
import { AiCoachService } from './ai-coach.service';
import { AiCoachRepository } from './repositories/ai-coach.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AiCoachSessionEntity.name, schema: AiCoachSessionSchema },
      { name: AiCoachMessageEntity.name, schema: AiCoachMessageSchema },
    ]),
    ConfigModule,
    AuthModule,
  ],
  controllers: [AiCoachController],
  providers: [AiCoachGateway, AiCoachRepository, AiCoachService],
  exports: [AiCoachService],
})
export class AiCoachModule {}
