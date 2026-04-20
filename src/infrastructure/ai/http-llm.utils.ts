import { LlmProviderError } from "./llm-provider.interface.js";

export function buildFinalPrompt(userQuery: string, contextRag?: string): string {
  return contextRag
    ? `[CONTEXTO RAG]\n${contextRag}\n\n[PREGUNTA]\n${userQuery}`
    : userQuery;
}

export function buildStructuredOutputSystemPrompt(systemPrompt: string, responseSchema?: unknown): string {
  if (!responseSchema) {
    return systemPrompt;
  }

  const schemaText = JSON.stringify(responseSchema, null, 2);
  return `${systemPrompt}\n\nDevuelve exclusivamente JSON valido, sin markdown ni texto adicional, que cumpla este esquema:\n${schemaText}`;
}

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

export function parseStructuredOutput(text: string, responseSchema?: unknown): unknown {
  if (!responseSchema) {
    return undefined;
  }

  return JSON.parse(text);
}

export function isRetryableStatus(statusCode?: number): boolean {
  if (!statusCode) {
    return true;
  }

  return statusCode === 408 || statusCode === 409 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
}

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