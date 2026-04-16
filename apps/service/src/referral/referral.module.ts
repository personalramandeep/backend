import { ReferralBonusEntity, ReferralCodeEntity, ReferralEntity } from '@app/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { UserModule } from '../user/user.module';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { ReferralRepository } from './repositories/referral.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralCodeEntity, ReferralEntity, ReferralBonusEntity]),
    ConfigModule,
    UserModule,
  ],
  controllers: [ReferralController],
  providers: [ReferralRepository, ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
