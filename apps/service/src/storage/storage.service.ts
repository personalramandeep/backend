import { Storage } from '@google-cloud/storage';
import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import path from 'path';
import { ConfigService } from '../config/config.service';
import {
  ALLOWED_MEDIA_MIME_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MEDIA_OBJECT_PREFIX,
} from '../media/media.constants';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucketName: string;
  private publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const { bucketName, clientEmail, privateKey, projectId } = this.configService.gcpConfig;

    this.bucketName = bucketName;
    this.publicBaseUrl =
      this.configService.get('MEDIA_BASE_URL') ||
      `https://storage.googleapis.com/${this.bucketName}`;

    this.storage = new Storage({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
  }

  private validateMime(mime: string) {
    if (!ALLOWED_MEDIA_MIME_TYPES.includes(mime)) {
      throw new BadRequestException('Unsupported MIME type');
    }
  }

  private resolveMaxSize(mime: string) {
    if (mime.startsWith('image/')) return MAX_IMAGE_SIZE;
    return MAX_VIDEO_SIZE;
  }

  buildPublicUrl(objectKey: string): string {
    return `${this.publicBaseUrl}/${objectKey}`;
  }

  buildGcsUri(objectKey: string): string {
    return `gs://${this.bucketName}/${objectKey}`;
  }

  buildOptionalPublicUrl(objectKey: string | null | undefined): string | null {
    return objectKey ? this.buildPublicUrl(objectKey) : null;
  }

  async buildSignedDownloadUrl(objectKey: string): Promise<string> {
    const file = this.storage.bucket(this.bucketName).file(objectKey);

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    });

    return url;
  }

  async generateSignedPostPolicy(
    dir: string,
    extension: string,
    mimeType: string,
  ): Promise<{
    curl: string;
    url: string;
    fields: Record<string, string>;
    objectKey: string;
  }> {
    this.validateMime(mimeType);

    const safeDir = dir.replace(/^\//, '').replace(/\.\./g, '');
    const objectKey = path.posix.join(MEDIA_OBJECT_PREFIX, safeDir, `${randomUUID()}.${extension}`);

    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(objectKey);

    const maxSize = this.resolveMaxSize(mimeType);

    const [response] = await file.generateSignedPostPolicyV4({
      expires: Date.now() + 15 * 60 * 1000,
      conditions: [
        ['content-length-range', 0, maxSize],
        ['eq', '$Content-Type', mimeType],
      ],
      fields: {
        'Content-Type': mimeType,
      },
    });

    const curl = `curl -X POST ${response.url} \\
      ${Object.entries(response.fields)
        .map(([k, v]) => `  -F "${k}=${v}" \\`)
        .join('\n')}
        -F "file=@file.mp4"`;

    return {
      curl,
      url: response.url,
      fields: response.fields,
      objectKey,
    };
  }

  async generateSignedPutUrl(
    dir: string,
    extension: string,
    mimeType: string,
  ): Promise<{
    url: string;
    objectKey: string;
  }> {
    this.validateMime(mimeType);

    const safeDir = dir.replace(/^\//, '').replace(/\.\./g, '');
    const objectKey = path.posix.join(MEDIA_OBJECT_PREFIX, safeDir, `${randomUUID()}.${extension}`);

    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(objectKey);

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: mimeType,
    });

    return {
      url,
      objectKey,
    };
  }

  async uploadBuffer(
    dir: string,
    buffer: Buffer,
    mimeType: string,
    extension: string,
  ): Promise<string> {
    const safeDir = dir.replace(/^\//, '').replace(/\.\./g, '');
    const objectKey = path.posix.join(MEDIA_OBJECT_PREFIX, safeDir, `${randomUUID()}.${extension}`);

    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(objectKey);

    await file.save(buffer, { contentType: mimeType });

    return objectKey;
  }

  async downloadObject(objectKey: string, bucketName?: string): Promise<Buffer> {
    const bucket = bucketName ?? this.bucketName;
    const [buffer] = await this.storage.bucket(bucket).file(objectKey).download();
    return buffer as Buffer;
  }

  async verifyObject(objectKey: string) {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(objectKey);

    const [metadata] = await file.getMetadata();

    return metadata;
  }
}
