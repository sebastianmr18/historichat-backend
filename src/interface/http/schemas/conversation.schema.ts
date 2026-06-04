/**
 * @file conversation.schema.ts
 * @description Esquemas de validacion Zod para consultas y creacion de conversaciones.
 */
import { z } from "zod";

export const listConversationsQuerySchema = z.object({
  character_id: z.string().uuid().optional(),
});