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
