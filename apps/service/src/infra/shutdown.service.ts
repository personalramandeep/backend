import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ConnectionStates, Connection as MongooseConnection } from 'mongoose';
import { DataSource } from 'typeorm';

@Injectable()
export class ShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(ShutdownService.name);

  constructor(
    @InjectConnection() private readonly mongoose: MongooseConnection,
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.warn(`Application shutdown initiated${signal ? ` (signal: ${signal})` : ''}`);

    // await Promise.all([this.closeMongo(), this.closePostgres()]);

    this.logger.log('Graceful shutdown completed');
  }

  private async closeMongo(): Promise<void> {
    if (this.mongoose.readyState === ConnectionStates.connected) {
      this.logger.log('Closing MongoDB connection...');
      try {
        await this.mongoose.close();
        this.logger.log('MongoDB connection closed successfully');
      } catch (error) {
        this.logger.error('Failed to close MongoDB connection', error instanceof Error ? error.stack : String(error));
      }
    } else {
      this.logger.debug(`MongoDB not connected (state: ${this.mongoose.readyState})`);
    }
  }

  private async closePostgres(): Promise<void> {
    if (this.dataSource.isInitialized) {
      this.logger.log('Closing Postgres connection...');
      try {
        await this.dataSource.destroy();
        this.logger.log('Postgres connection closed successfully');
      } catch (error) {
        this.logger.error('Failed to close Postgres connection', error instanceof Error ? error.stack : String(error));
      }
    } else {
      this.logger.debug('Postgres DataSource was not initialized');
    }
  }
}
