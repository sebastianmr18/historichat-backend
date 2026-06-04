/**
 * @file ws-errors.ts
 * @description Utilidades de formateo y mapeo para errores dirigidos a los clientes conectados a través de WebSockets (Socket.IO).
 */

import { ChatFlowError } from "../domain/errors/chat-flow.error.js";

/**
 * Estructura de error estandarizada y segura para ser transmitida al cliente WebSocket.
 */
export interface ClientError {
  /**
   * Mensaje de error descriptivo amigable para el usuario.
   */
  message: string;
  /**
   * Código identificador único representativo del tipo de error (ej. "CONVERSATION_NOT_FOUND").
   */
  code: string;
  /**
   * Etapa del ciclo de vida del flujo donde ocurrió el fallo.
   */
  stage: string;
  /**
   * Determina si la operación fallida puede ser reintentada de manera automática por el cliente.
   */
  retryable: boolean;
}

/**
 * Convierte un error desconocido (ej. excepciones internas de base de datos) en una estructura controlada y segura para el cliente.
 * Evita la fuga de información sensible mapeando errores genéricos a códigos estandarizados.
 * 
 * @param error - Excepción o error capturado de cualquier tipo.
 * @param fallbackMessage - Mensaje por defecto en caso de no poder extraer información útil del error original.
 * @returns Estructura estandarizada de ClientError para su transmisión segura por el canal.
 */
export function toClientError(error: unknown, fallbackMessage: string): ClientError {
  if (error instanceof ChatFlowError) {
    return {
      message: error.message,
      code: error.code,
      stage: error.stage,
      retryable: error.retryable,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
      code: "UNEXPECTED_ERROR",
      stage: "unknown",
      retryable: true,
    };
  }

  return {
    message: fallbackMessage,
    code: "UNEXPECTED_ERROR",
    stage: "unknown",
    retryable: true,
  };
}
