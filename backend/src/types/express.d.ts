import type { Logger } from 'pino';
import type { AuthenticatedUser } from '../modules/auth/types/auth.types';

declare global {
  namespace Express {
    interface Request {
      log: Logger;
      user?: AuthenticatedUser;
    }
  }
}

export {};
