import { StreakEntity, StreakEventEntity, StreakEventSchema, StreakSchema } from '@app/common';
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StreakEventRepository } from './repositories/streak-event.repository';
import { StreakRepository } from './repositories/streak.repository';
import { StreakController } from './streak.controller';
import { StreakService } from './streak.service';

import { UserModule } from '../user/user.module';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StreakEntity.name, schema: StreakSchema },
      { name: StreakEventEntity.name, schema: StreakEventSchema },
    ]),
    UserModule,
  ],
  controllers: [StreakController],
  providers: [StreakService, StreakRepository, StreakEventRepository],
  exports: [StreakService],
})
export class StreakModule {}
