/**
 * @file auth.utils.ts
 * @description Utilidades de autenticación de red para Express.
 * Proporciona métodos para extraer identificadores de usuario desde payloads JWT.
 */

import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

/**
 * Extrae el identificador único de usuario (userId) desde el objeto de petición (Request) de Express.
 * Soporta payloads JWT estándar que almacenan el ID en el campo `sub` o en el campo heredado `id`.
 * 
 * @param req - Objeto de petición Express (Request) que debe contener el usuario autenticado.
 * @returns El identificador del usuario como cadena, o undefined si no se encuentra autenticado.
 */
export function extractUserId(req: Request): string | undefined {
  if (!req.user) return undefined;
  if (typeof req.user === 'string') return req.user;

  const payload = req.user as JwtPayload & { id?: string };
  return (typeof payload.sub === 'string' ? payload.sub : undefined) ?? payload.id;
}