/**
 * @file character.schema.ts
 * @description Esquemas de validacion Zod para operaciones CRUD de personajes.
 */
import { z } from "zod";

export const createCharacterSchema = z.object({
  name: z
    .string({ error: "El campo 'name' es obligatorio" })
    .min(1, "El campo 'name' es obligatorio")
    .max(200, "El campo 'name' no puede superar 200 caracteres")
    .transform((v) => v.trim()),
  publicSlug: z.string().trim().max(200).optional(),
  role: z
    .string({ error: "El campo 'role' es obligatorio" })
    .min(1, "El campo 'role' es obligatorio")
    .max(300, "El campo 'role' no puede superar 300 caracteres")
    .transform((v) => v.trim()),
  biography: z
    .string({ error: "El campo 'biography' es obligatorio" })
    .min(1, "El campo 'biography' es obligatorio")
    .max(3000, "El campo 'biography' no puede superar 3000 caracteres")
    .transform((v) => v.trim()),
  description: z.string().trim().max(2000).optional(),
  keyTraits: z.array(z.string().max(200)).max(20).default([]),
  speechTics: z.array(z.string().max(200)).max(20).default([]),
  vectorDbName: z.string().max(200).default(""),
  voiceId: z.string().max(200).optional(),
  themeColor: z.string().max(50).optional(),
  themeColorLight: z.string().max(50).optional(),
  years: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  epoch: z.string().max(100).optional(),
  quote: z.string().max(500).optional(),
  imageUrl: z.string().max(500).optional(),
  backgroundImageUrl: z.string().max(500).optional(),
  ambientLabel: z.string().max(200).optional(),
  contentVariant: z.string().max(200).optional(),
  badge: z.enum(["popular", "new"]).optional(),
  topics: z.array(z.string().max(200)).max(20).default([]),
  isPublic: z.boolean().default(false),
});

export const updateCharacterSchema = createCharacterSchema
  .omit({ vectorDbName: true })
  .partial()
  .extend({
    vectorDbName: z.string().max(200).optional(),
  });

export const adminCharactersQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "El parametro 'page' debe ser mayor o igual a 1").default(1),
  limit: z.coerce.number().int().min(1, "El parametro 'limit' debe ser mayor o igual a 1").max(100, "El parametro 'limit' no puede superar 100").default(20),
  isPublic: z.preprocess(
    (value) => {
      if (value === undefined) {
        return undefined;
      }

      if (value === "true" || value === true) {
        return true;
      }

      if (value === "false" || value === false) {
        return false;
      }

      return value;
    },
    z.boolean({ error: "El parametro 'isPublic' debe ser true o false" }).optional(),
  ),
  userId: z.string().uuid("El parametro 'userId' debe ser un UUID valido").optional(),
});
