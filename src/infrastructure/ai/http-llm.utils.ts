/**
 * @file http-llm.utils.ts
 * @description Utilidades auxiliares comunes para la realizacion de llamadas HTTP a proveedores LLM.
 * Incluye funciones para construir prompts finales, inyectar esquemas de respuesta JSON,
 * procesar y parsear salidas del modelo y categorizar errores HTTP reintentables.
 */

import { LlmProviderError } from "./llm-provider.interface.js";
import { buildFinalUserPrompt } from "../../application/prompts/user-prompt-builder.js";

/**
 * Delegado que construye el prompt de usuario final envolviendo la consulta y el RAG en etiquetas XML.
 *
 * @param userQuery - Mensaje enviado por el usuario.
 * @param contextRag - Contexto documental recuperado del RAG.
 * @returns El prompt de usuario formateado.
 */
export function buildFinalPrompt(userQuery: string, contextRag?: string): string {
  return buildFinalUserPrompt(userQuery, contextRag);
}

/**
 * Modifica el prompt de sistema agregando instrucciones imperativas para devolver exclusivamente
 * un formato JSON valido que cumpla con el esquema provisto.
 *
 * @param systemPrompt - Instrucciones originales de sistema.
 * @param responseSchema - Esquema de validacion esperado para la salida estructurada.
 * @returns Prompt de sistema modificado.
 */
export function buildStructuredOutputSystemPrompt(systemPrompt: string, responseSchema?: unknown): string {
  if (!responseSchema) {
    return systemPrompt;
  }

  const schemaText = JSON.stringify(responseSchema, null, 2);
  return `${systemPrompt}\n\nDevuelve exclusivamente JSON valido, sin markdown ni texto adicional, que cumpla este esquema:\n${schemaText}`;
}

/**
 * Extrae y concatena el texto resultante del contenido devuelto por la API del LLM,
 * manejando tanto respuestas de tipo string plano como colecciones de partes/objetos de texto.
 *
 * @param content - Bloque de contenido devuelto por el modelo.
 * @returns Cadena de texto limpio consolidada.
 */
export function extractAssistantText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text;
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

/**
 * Parsea e interpreta el texto devuelto por el modelo como un JSON estructurado.
 *
 * @param text - Cadena JSON devuelta por el asistente.
 * @param responseSchema - Esquema de validacion que se aplico (opcional).
 * @returns Objeto JS parseado, o undefined si no se configuro un esquema.
 */
export function parseStructuredOutput(text: string, responseSchema?: unknown): unknown {
  if (!responseSchema) {
    return undefined;
  }

  return JSON.parse(text);
}

/**
 * Evalua si un codigo de estado HTTP recibido de la API del LLM es susceptible de reintento.
 *
 * @param statusCode - Codigo de respuesta HTTP.
 * @returns True si corresponde a Timeout, Conflict, Too Many Requests o Error del Servidor (>=500).
 */
export function isRetryableStatus(statusCode?: number): boolean {
  if (!statusCode) {
    return true;
  }

  return statusCode === 408 || statusCode === 409 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
}

/**
 * Normaliza cualquier excepcion atrapada durante la llamada al LLM a una instancia controlada LlmProviderError.
 *
 * @param params - Parametros del error incluyendo el proveedor, modelo y error original.
 * @returns Instancia de LlmProviderError.
 */
export function toLlmProviderError(params: {
  provider: string;
  model: string;
  message: string;
  error: unknown;
  statusCode?: number;
}): LlmProviderError {
  if (params.error instanceof LlmProviderError) {
    return params.error;
  }

  return new LlmProviderError(params.provider, params.model, params.message, {
    cause: params.error,
    retryable: isRetryableStatus(params.statusCode),
    statusCode: params.statusCode,
  });
}