import type { AuthUser } from './index';
declare global {
  namespace Express {
    interface Request { auth?: AuthUser; }
  }
}
export {};