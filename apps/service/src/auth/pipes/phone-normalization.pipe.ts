import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { parsePhoneNumberWithError } from 'libphonenumber-js';

@Injectable()
export class PhoneNormalizationPipe implements PipeTransform {
  transform<T>(value: T): T {
    if (!value || typeof value !== 'object') return value;

    if ('phone' in value && typeof value.phone === 'string') {
      value.phone = this.normalize(value.phone);
    }

    return value;
  }

  private normalize(raw: string): string {
    try {
      const parsed = parsePhoneNumberWithError(raw);

      if (!parsed?.isValid()) {
        throw new BadRequestException(
          `Invalid phone number: "${raw}". Use E.164 format e.g. +919876543210`,
        );
      }

      return parsed.format('E.164');
    } catch {
      throw new BadRequestException(
        `Invalid phone number: "${raw}". Use E.164 format e.g. +919876543210`,
      );
    }
  }
}
