/**
 * @file suggestions-prompt.ts
 * @description Definicion del esquema JSON para las sugerencias de continuacion de chat.
 * Se utiliza con la funcion de respuesta estructurada (responseSchema) de los modelos Gemini.
 */

/**
 * Esquema de salida para la sugerencia de mensajes.
 * Define la estructura que debe seguir el JSON devuelto por el modelo,
 * exigiendo exactamente tres sugerencias en espanol de maximo 80 caracteres.
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
