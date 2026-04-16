import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ConfigDto } from './config.dto';

function formatErrors(errors: any[]): string {
  return errors.map((err) => Object.values(err.constraints ?? {}).join(', ')).join('; ');
}

export function validateConfig(config: Record<string, unknown>) {
  const validated = plainToInstance(ConfigDto, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Config validation failed: ${formatErrors(errors)}`);
  }

  return validated;
}
