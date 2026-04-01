import { ConversationMode } from "../../shared/types.js";
import { Message } from "../../infrastructure/database/entities/Message.js";
import { buildModeSuggestionsPrompt } from "./suggestions-prompt-builder.js";

/**
 * JSON Schema for structured output of suggestions
 * Used with Gemini's responseSchema parameter
 */
export const suggestionsSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 3,
      description: "Exactamente 3 sugerencias en espanol, maximo 80 caracteres cada una",
    },
  },
  required: ["suggestions"],
};

/**
 * Build a prompt for generating suggestions based on conversation context and mode
 */
export function buildSuggestionsPrompt(
  _mode: ConversationMode | undefined,
  lastMessages: Message[]
): string {
  void _mode;

  return buildModeSuggestionsPrompt({
    mode: "interview",
    lastMessages,
  });
}
