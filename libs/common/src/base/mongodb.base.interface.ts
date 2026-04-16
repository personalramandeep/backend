import { Document, Types } from 'mongoose';

export interface IMongodbBaseDocument {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type MongodbBaseDocument<T> = Document<Types.ObjectId> & T & IMongodbBaseDocument;
