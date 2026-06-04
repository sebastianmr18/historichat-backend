/**
 * @file llm-orchestrator.service.ts
 * @description Orquestador de proveedores de modelos LLM.
 * Implementa un patron de failover/fallback secuencial: si un proveedor principal falla
 * (por ejemplo, por limites de tasa, timeouts o errores de red), delega de forma transparente
 * la generacion de la respuesta al siguiente proveedor secundario configurado.
 */

import { logger } from "../logging/logger.js";
import {
  LlmGenerateResponse,
  LlmHistoryMessage,
  LlmProvider,
  LlmProviderError,
} from "./llm-provider.interface.js";
import { InvalidAssistantOutputError, sanitizeAssistantOutput } from "../../shared/llm-output-sanitizer.js";

/**
 * Servicio orquestador que implementa LlmProvider.
 * Encapsula una lista ordenada de proveedores de LLM y maneja fallbacks.
 */
export class LlmOrchestratorService implements LlmProvider {
  /** Nombre identificativo del orquestador. */
  public readonly providerName = "orchestrator";
  /** Nombre identificador del modelo del orquestador. */
  public readonly modelName = "fallback";

  /**
   * Crea una instancia de LlmOrchestratorService.
   *
   * @param providers - Lista de proveedores ordenados por prioridad de ejecucion.
   */
  constructor(private readonly providers: LlmProvider[]) {}

  /**
   * Intenta generar una respuesta con el primer proveedor de la lista.
   * Si falla, captura el error y prueba con el siguiente (fallback), repitiendo la operacion
   * hasta agotar los proveedores o tener exito.
   * Aplica ademas sanitizacion del texto del asistente (a no ser que se pida salida estructurada JSON).
   *
   * @param systemPrompt - Instrucciones de comportamiento del sistema.
   * @param history - Historial de la conversacion.
   * @param userQuery - Consulta del usuario.
   * @param contextRag - Contexto documental del RAG (opcional).
   * @param responseSchema - Esquema de validacion de salida (opcional).
   * @returns La respuesta exitosa generada por uno de los proveedores.
   * @throws El ultimo error capturado si todos los proveedores fallan.
   */
  async generateResponse(
    systemPrompt: string,
    history: LlmHistoryMessage[],
    userQuery: string,
    contextRag?: string,
    responseSchema?: unknown
  ): Promise<LlmGenerateResponse> {
    if (this.providers.length === 0) {
      throw new Error("Error al generar respuesta con el LLM.");
    }

    let lastError: unknown;

    for (const [index, provider] of this.providers.entries()) {
      const attempt = index + 1;
      logger.debug("[llm.orchestrator] provider_attempt_started", {
        provider: provider.providerName,
        model: provider.modelName,
        attempt,
        fallbackDepth: index,
      });

      try {
        const response = await provider.generateResponse(
          systemPrompt,
          history,
          userQuery,
          contextRag,
          responseSchema
        );

        let text = response.text;
        if (!responseSchema) {
          try {
            text = sanitizeAssistantOutput(response.text, {
              allowJsonEnvelope: true,
              rejectCodeLikeContent: true,
            });
          } catch (error) {
            if (error instanceof InvalidAssistantOutputError) {
              throw new LlmProviderError(
                provider.providerName,
                provider.modelName,
                error.message,
                {
                  retryable: true,
                  cause: error,
                }
              );
            }

            throw error;
          }
        }

        logger.debug("[llm.orchestrator] provider_attempt_succeeded", {
          provider: response.provider,
          model: response.model,
          attempt,
          fallbackDepth: index,
          textLength: response.text.length,
          hasStructuredOutput: response.structuredOutput != null,
          text: response.text,
          structuredOutput: response.structuredOutput ?? null,
        });

        return {
          ...response,
          text,
        };
      } catch (error) {
        lastError = error;
        logger.warn("[llm.orchestrator] provider_attempt_failed", {
          provider: provider.providerName,
          model: provider.modelName,
          attempt,
          fallbackDepth: index,
          error,
        });
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Error al generar respuesta con el LLM.");
  }
}