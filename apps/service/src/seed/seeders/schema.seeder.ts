import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';

@Injectable()
export class SchemaSeeder {
  private readonly logger = new Logger(SchemaSeeder.name);

  private readonly sqlFiles = [
    'coach_rating_summary_trigger.sql',
    'coach_sessions_summary_trigger.sql',
  ];

  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    const migrationsDir = join(process.cwd(), 'apps/service/migrations');

    for (const file of this.sqlFiles) {
      const sqlPath = join(migrationsDir, file);
      const sql = readFileSync(sqlPath, 'utf8');
      this.logger.log(`Applying: ${file}`);

      await this.dataSource.query(sql);

      this.logger.log(`Done: ${file}`);
    }
  }
}
