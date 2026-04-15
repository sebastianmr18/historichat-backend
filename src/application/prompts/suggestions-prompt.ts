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
