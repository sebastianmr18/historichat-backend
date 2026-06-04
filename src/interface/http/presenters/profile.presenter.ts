/**
 * @file profile.presenter.ts
 * @description Presentador HTTP para transformar perfiles de usuario.
 * Convierte las entidades Profile a objetos de respuesta HTTP normalizados y validados (ProfileResponse).
 */

import { Profile } from "../../../infrastructure/database/entities/Profile.js";
import { ProfileResponse } from "../schemas/profile.schema.js";

/**
 * Formatea y normaliza una entidad Profile de base de datos para retornarla en la respuesta HTTP.
 *
 * @param profile - Entidad de perfil de usuario.
 * @returns Objeto formateado compatible con el esquema ProfileResponse.
 */
export function formatProfileResponse(profile: Profile): ProfileResponse {
  return {
    id: profile.id,
    username: profile.username ?? null,
    role: profile.role,
    createdAt: profile.createdAt ? profile.createdAt.toISOString() : new Date().toISOString(),
  };
}
