/**
 * @file conversation-mode.ts
 * @description Utilidades de normalización e inferencia para los modos de conversación heredados (legacy) y actuales.
 */

import { LegacyConversationMode, ConversationMode } from "./types.js";

/**
 * Normaliza un modo de conversación heredado para resolver y determinar el modo de conversación efectivo actual.
 * Proporciona compatibilidad hacia atrás con configuraciones antiguas mapeándolas a los modos vigentes del sistema.
 * 
 * @param mode - El modo de conversación original recibido (LegacyConversationMode).
 * @returns Objeto con el modo original y el modo efectivo resuelto (por defecto: "interview").
 */
export function normalizeConversationMode(mode?: LegacyConversationMode): {
  originalMode: LegacyConversationMode | undefined;
  effectiveMode: ConversationMode;
} {
  return {
    originalMode: mode,
    effectiveMode: "interview",
  };
}
