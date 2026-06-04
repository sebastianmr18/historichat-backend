/**
 * @file groq.service.ts
 * @description Proveedor de servicio LLM para la API de Groq Cloud (compatible con OpenAI API).
 * Implementa llamadas HTTP con control de timeout, abort controller, logs detallados de entrada/salida
 * y soporte para esquemas JSON en prompts del sistema.
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
 * Payload de respuesta tipico compatible con la API de OpenAI devuelto por Groq.
 */
interface OpenAiCompatibleResponse {
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
 * Adaptador del proveedor Groq que implementa la interfaz LlmProvider.
 */
export class GroqService implements LlmProvider {
  /** Nombre identificador del proveedor. */
  public readonly providerName = "groq";
  /** Nombre identificador del modelo Groq activo. */
  public readonly modelName: string;
  /** Clave de API secreta para autenticacion en Groq. */
  private readonly apiKey: string;
  /** Tiempo maximo de espera (timeout) configurado para la llamada HTTP. */
  private readonly timeoutMs: number;
  /** Endpoint principal de la API de completions de Groq. */
  private readonly endpoint = "https://api.groq.com/openai/v1/chat/completions";

  /**
   * Crea una instancia de GroqService.
   *
   * @param apiKey - Clave de API de Groq (se lee del entorno por defecto).
   * @param modelName - Nombre del modelo a interrogar (se lee del entorno por defecto).
   * @param timeoutMs - Limite de tiempo en milisegundos para abortar la llamada.
   */
  constructor(
    apiKey: string = env.GROQ_API_KEY ?? "",
    modelName: string = env.GROQ_CHAT_MODEL,
    timeoutMs: number = env.LLM_REQUEST_TIMEOUT_MS
  ) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Envia una peticion HTTP POST al endpoint de Groq para generar la respuesta de chat.
   *
   * @param systemPrompt - Instrucciones de comportamiento del sistema.
   * @param history - Historial de la conversacion.
   * @param userQuery - Mensaje enviado por el usuario.
   * @param contextRag - Contexto documental del RAG (opcional).
   * @param responseSchema - Esquema de validacion de salida (opcional).
   * @returns La respuesta estructurada del modelo Groq.
   * @throws LlmProviderError si Groq devuelve error, vacio o agota el tiempo de espera.
   */
  async generateResponse(
    systemPrompt: string,
    history: LlmHistoryMessage[],
    userQuery: string,
    contextRag?: string,
    responseSchema?: unknown
  ): Promise<LlmGenerateResponse> {
    if (!this.apiKey) {
      throw new LlmProviderError(this.providerName, this.modelName, "Groq no esta configurado.", {
        retryable: false,
      });
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeoutMs);

    try {
      const iterationId = `groq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const systemPromptSent = buildStructuredOutputSystemPrompt(systemPrompt, responseSchema);
      const historySent = history
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({ role: message.role, content: message.content }));
      const finalPrompt = buildFinalPrompt(userQuery, contextRag);

      logger.debug("[groq.iteration.input]", {
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

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
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

      const payload = (await response.json()) as OpenAiCompatibleResponse;
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
        throw new LlmProviderError(this.providerName, this.modelName, "Groq devolvio una respuesta vacia.", {
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
          ? "Groq agoto el tiempo de espera."
          : "Error al generar respuesta con el LLM.",
        error,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}