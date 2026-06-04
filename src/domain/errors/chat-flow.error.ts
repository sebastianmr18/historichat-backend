/**
 * @file chat-flow.error.ts
 * @description Clase de error de dominio para el control y tipado de fallos dentro del flujo de chat (texto, voz y debate).
 */

/**
 * Códigos de error específicos que categorizan los fallos en el procesamiento del flujo de chat.
 */
export type ChatFlowErrorCode =
  | "CONVERSATION_NOT_FOUND"
  | "INVALID_INPUT"
  | "STT_FAILED"
  | "NO_SPEECH"
  | "AUDIO_UPLOAD_FAILED"
  | "AI_RESPONSE_FAILED"
  | "TEXT_PROCESSING_FAILED"
  | "AUDIO_PROCESSING_FAILED"
  | "DEBATE_NOT_AVAILABLE"
  | "DEBATE_CHARACTER_NOT_FOUND"
  | "INVALID_DEBATE_CONFIGURATION";

/**
 * Error especializado del dominio para fallos ocurridos en el flujo de conversación de chat.
 * Agrupa metadatos críticos como el código del error, la etapa operativa donde ocurrió y la posibilidad de reintento.
 */
export class ChatFlowError extends Error {
  /**
   * Crea una instancia de ChatFlowError.
   * 
   * @param code - Código único representativo del tipo de error de flujo de chat.
   * @param message - Mensaje descriptivo y comprensible del error.
   * @param stage - Etapa del ciclo de vida del flujo de chat donde se originó el error.
   * @param retryable - Determina si la operación fallida puede ser reintentada de manera segura por el cliente.
   * @param cause - Causa raíz o error original subyacente (de base de datos, APIs de terceros, etc.).
   */
  constructor(
    public readonly code: ChatFlowErrorCode,
    message: string,
    public readonly stage: "validation" | "stt" | "upload" | "ai" | "persistence" | "tts" | "unknown",
    public readonly retryable: boolean,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ChatFlowError";
  }
}
