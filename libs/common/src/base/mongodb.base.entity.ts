import { Schema, SchemaOptions } from '@nestjs/mongoose';

@Schema()
export class MongodbBaseEntity {}

export const MONGODB_BASE_SCHEMA_OPTIONS: Partial<SchemaOptions> = {
  timestamps: true,
  validateBeforeSave: true,
  versionKey: false,
  strict: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
  },
};
