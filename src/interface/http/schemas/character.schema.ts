import { z } from "zod";

export const createCharacterSchema = z.object({
  name: z
    .string({ error: "El campo 'name' es obligatorio" })
    .min(1, "El campo 'name' es obligatorio")
    .transform((v) => v.trim()),
  role: z
    .string({ error: "El campo 'role' es obligatorio" })
    .min(1, "El campo 'role' es obligatorio")
    .transform((v) => v.trim()),
  biography: z
    .string({ error: "El campo 'biography' es obligatorio" })
    .min(1, "El campo 'biography' es obligatorio")
    .transform((v) => v.trim()),
  description: z.string().trim().optional(),
  keyTraits: z.array(z.string()).default([]),
  speechTics: z.array(z.string()).default([]),
  vectorDbName: z.string().default(""),
  voiceId: z.string().optional(),
  themeColor: z.string().optional(),
  themeColorLight: z.string().optional(),
  years: z.string().optional(),
  category: z.string().optional(),
  epoch: z.string().optional(),
  quote: z.string().optional(),
  imageUrl: z.string().optional(),
  backgroundImageUrl: z.string().optional(),
  badge: z.enum(["popular", "new"]).optional(),
  topics: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
});

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
