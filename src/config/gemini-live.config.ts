import { env } from '../config/env.js';

export const GEMINI_CONFIG = {
  apiKey: env.GEMINI_API_KEY,
  liveModel: env.GEMINI_MODEL,
  // Set properties on LiveConnectConfig directly to avoid deprecation warning.
  temperature: 0.3,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 2048,
  // speechConfig: shape expected by SDK; adjust if your SDK requires different keys.
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: { voiceName: "Puck" },
    },
  },
  systemInstruction: {
    parts: [
      {
        text:
          "Eres un asistente conversacional. Responde con audio cuando corresponda. Mantén respuestas concisas.",
      },
    ],
  },
}
