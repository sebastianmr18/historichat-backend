import { beforeEach, describe, expect, it, vi } from "vitest";
import { LlmOrchestratorService } from "../llm-orchestrator.service.js";
import { LlmProviderError, type LlmProvider } from "../llm-provider.interface.js";

function createProvider(name: string, model: string, implementation?: LlmProvider["generateResponse"]): LlmProvider {
  return {
    providerName: name,
    modelName: model,
    generateResponse: implementation ?? vi.fn().mockResolvedValue({
      text: `${name} ok`,
      provider: name,
      model,
    }),
  };
}

describe("LlmOrchestratorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the primary provider response when it succeeds", async () => {
    const primary = createProvider("gemini", "gemini-model");
    const secondary = createProvider("groq", "groq-model");
    const orchestrator = new LlmOrchestratorService([primary, secondary]);

    const result = await orchestrator.generateResponse("system", [], "hello");

    expect(result.provider).toBe("gemini");
    expect(primary.generateResponse).toHaveBeenCalledTimes(1);
    expect(secondary.generateResponse).not.toHaveBeenCalled();
  });

  it("falls back to the secondary provider when the primary fails", async () => {
    const primary = createProvider(
      "gemini",
      "gemini-model",
      vi.fn().mockRejectedValue(new LlmProviderError("gemini", "gemini-model", "primary down"))
    );
    const secondary = createProvider("groq", "groq-model");
    const tertiary = createProvider("openrouter", "openrouter-model");
    const orchestrator = new LlmOrchestratorService([primary, secondary, tertiary]);

    const result = await orchestrator.generateResponse("system", [], "hello");

    expect(result.provider).toBe("groq");
    expect(primary.generateResponse).toHaveBeenCalledTimes(1);
    expect(secondary.generateResponse).toHaveBeenCalledTimes(1);
    expect(tertiary.generateResponse).not.toHaveBeenCalled();
  });

  it("falls back to the tertiary provider when primary and secondary fail", async () => {
    const primary = createProvider(
      "gemini",
      "gemini-model",
      vi.fn().mockRejectedValue(new LlmProviderError("gemini", "gemini-model", "primary down"))
    );
    const secondary = createProvider(
      "groq",
      "groq-model",
      vi.fn().mockRejectedValue(new LlmProviderError("groq", "groq-model", "secondary down"))
    );
    const tertiary = createProvider("openrouter", "openrouter-model");
    const orchestrator = new LlmOrchestratorService([primary, secondary, tertiary]);

    const result = await orchestrator.generateResponse("system", [], "hello");

    expect(result.provider).toBe("openrouter");
    expect(primary.generateResponse).toHaveBeenCalledTimes(1);
    expect(secondary.generateResponse).toHaveBeenCalledTimes(1);
    expect(tertiary.generateResponse).toHaveBeenCalledTimes(1);
  });

  it("rethrows the last provider error when all providers fail", async () => {
    const lastError = new LlmProviderError("openrouter", "openrouter-model", "tertiary down");
    const primary = createProvider(
      "gemini",
      "gemini-model",
      vi.fn().mockRejectedValue(new LlmProviderError("gemini", "gemini-model", "primary down"))
    );
    const secondary = createProvider(
      "groq",
      "groq-model",
      vi.fn().mockRejectedValue(new LlmProviderError("groq", "groq-model", "secondary down"))
    );
    const tertiary = createProvider(
      "openrouter",
      "openrouter-model",
      vi.fn().mockRejectedValue(lastError)
    );
    const orchestrator = new LlmOrchestratorService([primary, secondary, tertiary]);

    await expect(orchestrator.generateResponse("system", [], "hello")).rejects.toBe(lastError);
  });
});