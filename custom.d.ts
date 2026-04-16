import { IAuthenticatedUser } from './apps/service/src/auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: IAuthenticatedUser;
    }
  }
}

// import { Socket as IOSocket } from 'socket.io';
// export interface WsUserData {
//   user?: IAuthenticatedUser;
// }

// export type TypedSocket = IOSocket<any, any, any, WsUserData>;

export {};
