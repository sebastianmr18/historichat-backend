/**
 * @file debate-turn.schema.ts
 * @description Esquema de validacion JSON de respuesta estructurada para turnos de debate.
 * Determina el formato esperado por el sistema para decidir si se responde o se pasa el turno.
 */

/**
 * Esquema de respuesta estructurada para el modelo en modo debate.
 * Permite que el LLM devuelva un JSON estructurado que indica si respondera o pasara el turno,
 * junto con la confianza de su decision y la justificacion.
 */
export const debateTurnSchema = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["respond", "skip"] },
    text: { type: "string" },
    reason: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    skipReason: {
      type: "string",
      enum: ["not_applicable", "strategy", "unknown", "manual_user", "auto_low_confidence"],
    },
  },
  required: ["action", "confidence"],
  //additionalProperties: true,
};
