import { z } from "zod";

export const listConversationsQuerySchema = z.object({
  character_id: z.string().uuid().optional(),
});