import { env } from '../config/env.js';

export const GEMINI_CONFIG = {
  apiKey: env.GEMINI_API_KEY,
  // Modelo optimizado para real-time (baja latencia)
  liveModel: 'gemini-2.5-flash-native-audio-preview-09-2025', 
  // Configuración de generación por defecto
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 2048,
  },
  // Instrucciones del sistema base para el modo Live
  systemInstruction: {
    parts: [
      {
        text: 'Eres un asistente conversacional avanzado. Responde de manera concisa, natural y fluida. Tu objetivo es mantener una conversación de voz en tiempo real. Evita formateo markdown complejo ya que tu respuesta será leída por un sistema TTS.',
      },
    ],
  },
};