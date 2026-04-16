import { MediaEntity, MediaSchema } from '@app/common';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StorageModule } from '../storage/storage.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaRepository } from './repositories/media.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MediaEntity.name, schema: MediaSchema }]),
    StorageModule,
  ],
  controllers: [MediaController],
  providers: [MediaService, MediaRepository],
  exports: [MediaService],
})
export class MediaModule {}
