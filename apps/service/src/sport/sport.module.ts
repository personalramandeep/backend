import { PlayerSportEntity, SportEntity, SportMetricEntity } from '@app/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerSportRepository } from './repositories/player-sport.repository';
import { SportMetricRepository } from './repositories/sport-metric.repository';
import { SportRepository } from './repositories/sport.repository';
import { SportController } from './sport.controller';
import { SportService } from './sport.service';

@Module({
  imports: [TypeOrmModule.forFeature([SportEntity, SportMetricEntity, PlayerSportEntity])],
  controllers: [SportController],
  providers: [SportService, SportRepository, SportMetricRepository, PlayerSportRepository],
  exports: [SportService],
})
export class SportModule {}
