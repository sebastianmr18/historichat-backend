import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../../config/env.js';

export class SupabaseTokenVerifier {
  private readonly jwtSecret: string;

  constructor() {
    this.jwtSecret = env.SUPABASE_JWT_SECRET;
  }

  public verifyToken(token: string): string | JwtPayload {
    try {
      return jwt.verify(token, this.jwtSecret, {
        audience: 'authenticated',
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}