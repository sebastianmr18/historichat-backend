import fetch from "node-fetch";
import { env } from "../../config/env.js";
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

export class OpenRouterService implements LlmProvider {
  public readonly providerName = "openrouter";
  public readonly modelName: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly endpoint = "https://openrouter.ai/api/v1/chat/completions";

  constructor(
    apiKey: string = env.OPENROUTER_API_KEY ?? "",
    modelName: string = env.OPENROUTER_CHAT_MODEL,
    timeoutMs: number = env.LLM_REQUEST_TIMEOUT_MS
  ) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.timeoutMs = timeoutMs;
  }

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
            { role: "system", content: buildStructuredOutputSystemPrompt(systemPrompt, responseSchema) },
            ...history
              .filter((message) => message.role === "user" || message.role === "assistant")
              .map((message) => ({ role: message.role, content: message.content })),
            { role: "user", content: buildFinalPrompt(userQuery, contextRag) },
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