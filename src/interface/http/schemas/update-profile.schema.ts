/**
 * @file update-profile.schema.ts
 * @description Esquema de validacion Zod para actualizar el perfil del usuario autenticado.
 */
import { z } from "zod";

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "El username debe tener al menos 3 caracteres")
    .max(50, "El username no puede superar 50 caracteres")
    .regex(/^\S+$/, "El username no puede contener espacios"),
});
