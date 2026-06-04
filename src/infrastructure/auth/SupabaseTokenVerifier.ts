/**
 * @file SupabaseTokenVerifier.ts
 * @description Verificador de tokens JWT emitidos por Supabase.
 * Obtiene las llaves publicas de firma desde el endpoint JWKS de Supabase y valida
 * la firma y vigencia de los tokens enviados por los clientes.
 */

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { env } from '../../config/env.js';

/**
 * Clase encargada de verificar y decodificar tokens de autenticacion JWT provistos por Supabase.
 * Utiliza un cliente JWKS para obtener de forma dinamica y almacenar en cache las claves de firma.
 */
export class SupabaseTokenVerifier {
  /** Cliente JWKS para recuperar las claves de firma publicas de Supabase. */
  private client: jwksClient.JwksClient;

  /**
   * Crea una instancia de SupabaseTokenVerifier e inicializa el cliente JWKS.
   */
  constructor() {
    this.client = jwksClient({
      jwksUri: `${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
      cache: true,
      rateLimit: true
    });
  }

  /**
   * Obtiene la clave publica de firma correspondiente al identificador de clave (kid) provisto en la cabecera del JWT.
   *
   * @param header - Cabecera del token JWT conteniendo el campo kid.
   * @param callback - Callback devuelto al verificador de jsonwebtoken con la clave de firma.
   */
  private getKey = (header: any, callback: any) => {
    this.client.getSigningKey(header.kid, (err, key) => {
      if (err) return callback(err);
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    });
  }

  /**
   * Verifica la firma, algoritmos y audiencia de un token JWT.
   *
   * @param token - Token JWT en formato string.
   * @returns Promesa que se resuelve con el payload decodificado del JWT si es valido.
   * @throws Error si la verificacion del token falla.
   */
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