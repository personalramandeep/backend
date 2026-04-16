import { EMediaStatus, MediaDocument } from '@app/common';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { extname } from 'path';
import { StorageService } from '../storage/storage.service';
import { ALLOWED_MEDIA_EXTENSIONS, ALLOWED_MEDIA_MIME_TYPES } from './media.constants';
import { MediaRepository } from './repositories/media.repository';

@Injectable()
export class MediaService {
  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly storageService: StorageService,
  ) {}

  validateExtension(filename: string) {
    const ext = extname(filename).replace('.', '').toLowerCase();

    if (!ALLOWED_MEDIA_EXTENSIONS.includes(ext)) {
      throw new BadRequestException('Invalid file extension');
    }

    return ext;
  }

  getPublicUrl(media: MediaDocument): string {
    return this.storageService.buildPublicUrl(media.objectKey);
  }

  async initiateUpload(userId: string, filename: string, mimeType: string) {
    if (!ALLOWED_MEDIA_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException('Invalid MIME type');
    }

    const extension = this.validateExtension(filename);

    const { url, objectKey } = await this.storageService.generateSignedPutUrl(
      userId,
      extension,
      mimeType,
    );

    const media = await this.mediaRepository.create({
      userId: userId,
      objectKey,
      mimeType,
      extension,
      size: 0,
      status: EMediaStatus.PENDING,
    });

    return {
      mediaId: media._id,
      uploadUrl: url,
    };
  }

  async completeUpload(mediaId: string) {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) throw new NotFoundException();

    if (media.status !== EMediaStatus.PENDING) {
      throw new BadRequestException('Invalid state');
    }

    const metadata = await this.storageService.verifyObject(media.objectKey);

    if (metadata.contentType !== media.mimeType) {
      media.status = EMediaStatus.FAILED;
      await media.save();
      throw new BadRequestException('MIME mismatch');
    }

    media.size = Number(metadata.size);
    // media.gcsGeneration = metadata.generation;
    media.status = EMediaStatus.UPLOADED;

    await media.save();

    return media;
  }

  async lockSession(data: {
    mediaId: string;
    userId: string;
    fromStatus: EMediaStatus;
    toStatus: EMediaStatus;
  }) {
    const { mediaId, userId, fromStatus, toStatus } = data;

    const session = await this.mediaRepository.findOneAndUpdate(
      { _id: mediaId, userId, status: fromStatus },
      { $set: { status: toStatus } },
      { returnDocument: 'after' },
    );

    if (!session) {
      throw new BadRequestException('Invalid upload session');
    }

    return session;
  }

  async attachToPost(mediaIds: string[] | Types.ObjectId[], postId: string | Types.ObjectId) {
    return this.mediaRepository.updateMany(
      { _id: { $in: mediaIds } },
      { $set: { linkedPostId: postId, status: EMediaStatus.ATTACHED } },
    );
  }
}
