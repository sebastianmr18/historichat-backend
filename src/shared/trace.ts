/**
 * @file trace.ts
 * @description Utilidades para la generación de identificadores y contextos de rastreo (tracing) en peticiones HTTP y WebSocket.
 */

import { RequestTraceContext } from "./types.js";

/**
 * Genera un identificador de rastreo único (Trace ID).
 * Combina un prefijo, una marca de tiempo Unix y un número aleatorio para evitar colisiones.
 * 
 * @param prefix - Prefijo de clasificación para el identificador (por defecto: "trace").
 * @returns Cadena de caracteres única representativa del Trace ID generado.
 */
export function generateTraceId(prefix: string = "trace"): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

/**
 * Consolida un contexto de rastreo para su inclusión en registros de log, extendiéndolo con metadatos adicionales.
 * Si no se proporciona un contexto inicial, se autogenera un nuevo identificador de rastreo.
 * 
 * @param base - Contexto base original procedente de la petición.
 * @param extras - Metadatos adicionales opcionales para enriquecer el contexto resultante.
 * @returns Registro mapeado con toda la información de rastreo y metadatos complementarios.
 */
export function createTraceContext(
  base: RequestTraceContext | undefined,
  extras: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    traceId: base?.traceId ?? generateTraceId(),
    socketId: base?.socketId,
    event: base?.event,
    ...extras,
  };
}
