/**
 * @file authorization.middleware.ts
 * @description Middleware de Express para verificar la autorización y los roles de seguridad de los usuarios.
 */

import { RequestHandler } from "express";
import { AppDataSource } from "../config/database.js";
import { Profile } from "../infrastructure/database/entities/Profile.js";
import { isUserRole } from "../domain/auth/user-role.js";
import { extractUserId } from "./auth.utils.js";

/**
 * Middleware Express que restringe el acceso de forma exclusiva a usuarios con rol administrativo ("admin").
 * Extrae el ID de usuario de la petición, consulta su perfil en la base de datos PostgreSQL,
 * verifica su rol mediante el guardián de tipos y lo adjunta a `req.userRole`.
 * 
 * Si el usuario no posee el rol 'admin', interrumpe la petición con un código 403 Forbidden.
 * 
 * @param req - Objeto de petición Express (Request).
 * @param res - Objeto de respuesta Express (Response).
 * @param next - Función callback para continuar al siguiente middleware.
 * @returns Promesa que resuelve a void.
 */
export const requireAdminRole: RequestHandler = async (req, res, next) => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const profileRepo = AppDataSource.getRepository(Profile);
    const profile = await profileRepo.findOne({
      where: { id: userId as any },
      select: { role: true },
    });

    const role = isUserRole(profile?.role) ? profile.role : "user";
    req.userRole = role;

    if (role !== "admin") {
      res.status(403).json({ error: "Forbidden: admin role required." });
      return;
    }

    next();
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
};