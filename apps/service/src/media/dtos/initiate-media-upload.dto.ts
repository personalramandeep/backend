import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, registerDecorator, ValidationOptions } from 'class-validator';
import { extname } from 'path';
import { ALLOWED_MEDIA_EXTENSIONS, ALLOWED_MEDIA_MIME_TYPES } from '../media.constants';

export function IsSafeFilename(allowedExtensions: string[], validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSafeFilename',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (typeof value !== 'string') return false;

          if (value.length > 255 || value.includes('/') || value.includes('\\')) {
            return false;
          }

          const ext = extname(value).replace('.', '').toLowerCase();
          if (!ext) return false;

          return /^[a-zA-Z0-9._-]+$/.test(value) && allowedExtensions.includes(ext);
        },
      },
    });
  };
}

export class InitiateMediaUploadDto {
  @IsSafeFilename(ALLOWED_MEDIA_EXTENSIONS, { message: 'Invalid or unsafe filename' })
  @IsNotEmpty()
  @ApiProperty({ description: 'The name of the file to be uploaded', example: 'video.mp4' })
  filename: string;

  @IsIn(ALLOWED_MEDIA_MIME_TYPES, { message: 'Invalid MIME type' })
  @ApiProperty({
    enum: ALLOWED_MEDIA_MIME_TYPES,
    description: 'The MIME type of the file',
    example: 'video/mp4',
  })
  mimeType: string;
}
