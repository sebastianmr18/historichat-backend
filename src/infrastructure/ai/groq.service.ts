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

export class GroqService implements LlmProvider {
  public readonly providerName = "groq";
  public readonly modelName: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly endpoint = "https://api.groq.com/openai/v1/chat/completions";

  constructor(
    apiKey: string = env.GROQ_API_KEY ?? "",
    modelName: string = env.GROQ_CHAT_MODEL,
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
      throw new LlmProviderError(this.providerName, this.modelName, "Groq no esta configurado.", {
        retryable: false,
      });
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
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