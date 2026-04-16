import { registerDecorator, ValidationOptions } from 'class-validator';
import { IANAZone } from 'luxon';

export function IsIanaTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIanaTimezone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value?: string) {
          if (value === undefined || value === null || value === '') {
            return true;
          }

          return IANAZone.isValidZone(value);
        },
      },
    });
  };
}
