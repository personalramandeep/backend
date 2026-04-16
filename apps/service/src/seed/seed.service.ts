import { Injectable, Logger } from '@nestjs/common';
import { BillingSeeder } from './seeders/billing.seeder';
import { RoleSeeder } from './seeders/role.seeder';
import { SchemaSeeder } from './seeders/schema.seeder';
import { SportSeeder } from './seeders/sport.seeder';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly schemaSeeder: SchemaSeeder,
    private readonly roleSeeder: RoleSeeder,
    private readonly sportSeeder: SportSeeder,
    private readonly billingSeeder: BillingSeeder,
  ) {}

  async runAll(): Promise<void> {
    this.logger.log('Starting seed run...');

    await this.schemaSeeder.run();

    // Seed reference data
    await this.roleSeeder.run();
    await this.sportSeeder.run();
    await this.billingSeeder.run();

    this.logger.log('All seeders completed successfully');
  }
}
