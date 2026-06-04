/**
 * @file admin.schema.ts
 * @description Esquemas de validacion Zod para endpoints administrativos.
 */
import { z } from "zod";

export const updateUserRoleSchema = z.object({
  role: z.enum(["user", "admin"], { error: "El rol debe ser 'user' o 'admin'" }),
});
