import { logger } from "../logging/logger.js";
import {
  LlmGenerateResponse,
  LlmHistoryMessage,
  LlmProvider,
  LlmProviderError,
} from "./llm-provider.interface.js";
import { InvalidAssistantOutputError, sanitizeAssistantOutput } from "../../shared/llm-output-sanitizer.js";

export class LlmOrchestratorService implements LlmProvider {
  public readonly providerName = "orchestrator";
  public readonly modelName = "fallback";

  constructor(private readonly providers: LlmProvider[]) {}

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