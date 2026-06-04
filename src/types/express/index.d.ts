/**
 * @file index.d.ts
 * @description Ampliación de tipos global para el namespace Express.
 * Permite tipar de forma estricta los atributos personalizados inyectados en la petición (Request).
 */

import { JwtPayload } from 'jsonwebtoken';
import { UserRole } from '../../domain/auth/user-role.js';

declare global {
  namespace Express {
    interface Request {
      /**
       * Payload decodificado del JWT o identificador único de usuario autenticado.
       */
      user?: string | JwtPayload;
      /**
       * Rol de seguridad autorizado del usuario que realiza la petición HTTP.
       */
      userRole?: UserRole;
    }
  }
}