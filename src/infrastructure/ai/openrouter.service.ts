/**
 * @file openrouter.service.ts
 * @description Proveedor de servicio LLM para la API de OpenRouter.
 * Permite delegar la generacion de respuestas a multiples modelos alojados en OpenRouter,
 * manejando cabeceras personalizadas de identificacion del referrer/aplicacion y control de timeouts.
 */

import fetch from "node-fetch";
import { env } from "../../config/env.js";
import { logger } from "../logging/logger.js";
import {
  buildFinalPrompt,
  buildStructuredOutputSystemPrompt,
  extractAssistantText,
  isRetryableStatus,
  parseStructuredOutput,
  toLlmProviderError,
} from "./http-llm.utils.js";
import {
  LlmGenerateResponse,
  LlmHistoryMessage,
  LlmProvider,
  LlmProviderError,
} from "./llm-provider.interface.js";

/**
 * Payload de respuesta tipico devuelto por la API de OpenRouter.
 */
interface OpenRouterResponse {
  error?: {
    message?: string;
  };
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
}

/**
 * Adaptador de OpenRouter que implementa la interfaz LlmProvider.
 */
export class OpenRouterService implements LlmProvider {
  /** Nombre identificador del proveedor. */
  public readonly providerName = "openrouter";
  /** Nombre identificador del modelo en OpenRouter. */
  public readonly modelName: string;
  /** Clave de API de OpenRouter. */
  private readonly apiKey: string;
  /** Tiempo de espera (timeout) de la peticion HTTP en milisegundos. */
  private readonly timeoutMs: number;
  /** Endpoint principal de la API de OpenRouter. */
  private readonly endpoint = "https://openrouter.ai/api/v1/chat/completions";

  /**
   * Crea una instancia de OpenRouterService.
   *
   * @param apiKey - Clave de API de OpenRouter (leida por defecto del entorno).
   * @param modelName - Nombre del modelo a utilizar.
   * @param timeoutMs - Limite de tiempo antes de abortar la llamada.
   */
  constructor(
    apiKey: string = env.OPENROUTER_API_KEY ?? "",
    modelName: string = env.OPENROUTER_CHAT_MODEL,
    timeoutMs: number = env.LLM_REQUEST_TIMEOUT_MS
  ) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Envia una peticion HTTP POST a OpenRouter para generar una respuesta.
   *
   * @param systemPrompt - Instrucciones de comportamiento del sistema.
   * @param history - Historial de la conversacion.
   * @param userQuery - Mensaje enviado por el usuario.
   * @param contextRag - Contexto RAG del personaje.
   * @param responseSchema - Esquema de validacion estructurada (opcional).
   * @returns La respuesta estructurada del modelo.
   * @throws LlmProviderError si falla la API de OpenRouter o se agota el tiempo de espera.
   */
  async generateResponse(
    systemPrompt: string,
    history: LlmHistoryMessage[],
    userQuery: string,
    contextRag?: string,
    responseSchema?: unknown
  ): Promise<LlmGenerateResponse> {
    if (!this.apiKey) {
      throw new LlmProviderError(this.providerName, this.modelName, "OpenRouter no esta configurado.", {
        retryable: false,
      });
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeoutMs);

    try {
      const iterationId = `openrouter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const systemPromptSent = buildStructuredOutputSystemPrompt(systemPrompt, responseSchema);
      const historySent = history
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({ role: message.role, content: message.content }));
      const finalPrompt = buildFinalPrompt(userQuery, contextRag);

      logger.debug("[openrouter.iteration.input]", {
        iterationId,
        model: this.modelName,
        systemPrompt,
        systemPromptSent,
        historyOriginalCount: history.length,
        historySentCount: historySent.length,
        historyDroppedCount: Math.max(0, history.length - historySent.length),
        historySent,
        finalPrompt,
      });

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      };

      if (env.OPENROUTER_HTTP_REFERER) {
        headers["HTTP-Referer"] = env.OPENROUTER_HTTP_REFERER;
      }

      if (env.OPENROUTER_APP_TITLE) {
        headers["X-Title"] = env.OPENROUTER_APP_TITLE;
      }

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: "system", content: systemPromptSent },
            ...historySent,
            { role: "user", content: finalPrompt },
          ],
          temperature: 0.7,
        }),
        signal: abortController.signal,
      });

      const payload = (await response.json()) as OpenRouterResponse;
      if (!response.ok) {
        throw new LlmProviderError(
          this.providerName,
          this.modelName,
          payload.error?.message || "Error al generar respuesta con el LLM.",
          {
            statusCode: response.status,
            retryable: isRetryableStatus(response.status),
            cause: payload,
          }
        );
      }

      const text = extractAssistantText(payload.choices?.[0]?.message?.content).trim();
      if (!text) {
        throw new LlmProviderError(this.providerName, this.modelName, "OpenRouter devolvio una respuesta vacia.", {
          retryable: true,
          statusCode: response.status,
          cause: payload,
        });
      }

      let structuredOutput: unknown;
      try {
        structuredOutput = parseStructuredOutput(text, responseSchema);
      } catch {
        structuredOutput = undefined;
      }

      return {
        text,
        structuredOutput,
        provider: this.providerName,
        model: this.modelName,
      };
    } catch (error) {
      throw toLlmProviderError({
        provider: this.providerName,
        model: this.modelName,
        message: error instanceof Error && error.name === "AbortError"
          ? "OpenRouter agoto el tiempo de espera."
          : "Error al generar respuesta con el LLM.",
        error,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}