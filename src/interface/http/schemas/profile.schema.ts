/**
 * @file profile.schema.ts
 * @description Esquema de respuesta Zod para el perfil de usuario.
 */
import { z } from "zod";

export const profileSchema = z.object({
  id: z.string().uuid(),
  username: z.string().nullable(),
  role: z.enum(["user", "admin"]),
  createdAt: z.string().datetime(),
});

export type ProfileResponse = z.infer<typeof profileSchema>;
