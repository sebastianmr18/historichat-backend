import { JwtPayload } from 'jsonwebtoken';
import { UserRole } from '../../domain/auth/user-role.js';

declare global {
  namespace Express {
    interface Request {
      user?: string | JwtPayload;
      userRole?: UserRole;
    }
  }
}