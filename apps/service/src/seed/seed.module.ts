import {
  FeatureEntity,
  PG_ENTITIES,
  PlanEntity,
  PlanFeatureEntity,
  PriceEntity,
  ProductEntity,
  RoleEntity,
  SportEntity,
} from '@app/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { SeedService } from './seed.service';
import { BillingSeeder } from './seeders/billing.seeder';
import { RoleSeeder } from './seeders/role.seeder';
import { SchemaSeeder } from './seeders/schema.seeder';
import { SportSeeder } from './seeders/sport.seeder';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('PG_URI'),
        entities: PG_ENTITIES,
        synchronize: false,
        logging: false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      ProductEntity,
      PlanEntity,
      PriceEntity,
      FeatureEntity,
      PlanFeatureEntity,
      RoleEntity,
      SportEntity,
    ]),
  ],
  providers: [SeedService, BillingSeeder, RoleSeeder, SportSeeder, SchemaSeeder],
})
export class SeedModule {}
