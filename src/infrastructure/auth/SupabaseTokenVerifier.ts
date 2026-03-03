import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { env } from '../../config/env.js';

export class SupabaseTokenVerifier {
  private client: jwksClient.JwksClient;

  constructor() {
    this.client = jwksClient({
      jwksUri: `${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
      cache: true,
      rateLimit: true
    });
  }

  private getKey = (header: any, callback: any) => {
    this.client.getSigningKey(header.kid, (err, key) => {
      if (err) return callback(err);
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    });
  }

  public async verifyToken(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token, 
        this.getKey, 
        { algorithms: ['ES256', 'HS256'], audience: 'authenticated' }, 
        (err, decoded) => {
          if (err) {
            console.error('❌ JWT Verification Error:', err.message);
            return reject(err);
          }
          resolve(decoded);
        }
      );
    });
  }
}