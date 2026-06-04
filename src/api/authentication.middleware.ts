/**
 * @file authentication.middleware.ts
 * @description Middleware de Express para verificar la identidad del usuario mediante tokens JWT de Supabase.
 */

import { Request, Response, NextFunction } from 'express';
import { SupabaseTokenVerifier } from '../infrastructure/auth/SupabaseTokenVerifier.js';

/**
 * Instancia única del verificador de tokens JWT de Supabase.
 */
const verifier = new SupabaseTokenVerifier();

/**
 * Middleware Express que restringe el acceso únicamente a peticiones autenticadas.
 * Extrae el token JWT del encabezado `Authorization: Bearer <token>`, valida su firma, vigencia,
 * y adjunta el payload decodificado al objeto `req.user` para su posterior consumo en la ruta.
 * 
 * @param req - Objeto de petición Express (Request).
 * @param res - Objeto de respuesta Express (Response).
 * @param next - Función callback para continuar con el siguiente middleware en la cadena.
 * @returns Promesa que resuelve a void. Devuelve 401 Unauthorized si el token falta o es inválido.
 */
export const requireAuthentication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = await verifier.verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};