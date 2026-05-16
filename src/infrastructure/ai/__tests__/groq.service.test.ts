import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../config/env.js", () => ({
  env: {
    GROQ_API_KEY: "test-groq-key",
    GROQ_CHAT_MODEL: "llama3-8b-8192",
    LLM_REQUEST_TIMEOUT_MS: 30000,
  },
}));

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.mock("node-fetch", () => ({ default: mockFetch }));

import { GroqService } from "../groq.service.js";
import { LlmProviderError } from "../llm-provider.interface.js";

function buildOkResponse(text: string, status = 200) {
  return {
    ok: true,
    status,
    json: vi.fn().mockResolvedValue({
      choices: [{ message: { content: text } }],
    }),
  };
}

function buildErrorResponse(status: number, errorMessage = "API error") {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({
      error: { message: errorMessage },
    }),
  };
}

describe("GroqService", () => {
  let service: GroqService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GroqService("test-groq-key", "llama3-8b-8192", 30000);
  });

  it("returns text response on successful API call", async () => {
    mockFetch.mockResolvedValue(buildOkResponse("Hola, soy Ada Lovelace."));

    const result = await service.generateResponse("system prompt", [], "hello");

    expect(result.text).toBe("Hola, soy Ada Lovelace.");
    expect(result.provider).toBe("groq");
    expect(result.model).toBe("llama3-8b-8192");
  });

  it("sends POST to Groq endpoint with correct Authorization header", async () => {
    mockFetch.mockResolvedValue(buildOkResponse("response"));

    await service.generateResponse("sys", [], "query");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-groq-key",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("throws LlmProviderError when API key is missing", async () => {
    const emptyKeyService = new GroqService("", "llama3", 30000);

    await expect(emptyKeyService.generateResponse("sys", [], "query")).rejects.toThrow(LlmProviderError);
  });

  it("throws LlmProviderError with non-retryable flag when API key is missing", async () => {
    const emptyKeyService = new GroqService("", "llama3", 30000);

    await expect(emptyKeyService.generateResponse("sys", [], "query")).rejects.toMatchObject({
      retryable: false,
      provider: "groq",
    });
  });

  it("throws LlmProviderError on 429 rate limit response", async () => {
    mockFetch.mockResolvedValue(buildErrorResponse(429, "Rate limit exceeded"));

    await expect(service.generateResponse("sys", [], "query")).rejects.toThrow(LlmProviderError);
  });

  it("marks 429 error as retryable", async () => {
    mockFetch.mockResolvedValue(buildErrorResponse(429, "Rate limit exceeded"));

    await expect(service.generateResponse("sys", [], "query")).rejects.toMatchObject({
      retryable: true,
      statusCode: 429,
    });
  });

  it("throws LlmProviderError on 500 server error", async () => {
    mockFetch.mockResolvedValue(buildErrorResponse(500, "Internal Server Error"));

    await expect(service.generateResponse("sys", [], "query")).rejects.toThrow(LlmProviderError);
  });

  it("throws LlmProviderError when response text is empty", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "" } }],
      }),
    });

    await expect(service.generateResponse("sys", [], "query")).rejects.toThrow(LlmProviderError);
  });

  it("throws LlmProviderError with timeout message on AbortError", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValue(abortError);

    const fastService = new GroqService("test-key", "llama3", 1);
    await expect(fastService.generateResponse("sys", [], "query")).rejects.toMatchObject({
      message: "Groq agoto el tiempo de espera.",
    });
  });

  it("parses structured output when responseSchema is provided", async () => {
    const jsonResponse = '{"action":"respond","reason":"test"}';
    mockFetch.mockResolvedValue(buildOkResponse(jsonResponse));

    const schema = { type: "object" };
    const result = await service.generateResponse("sys", [], "query", undefined, schema);

    expect(result.structuredOutput).toEqual({ action: "respond", reason: "test" });
  });

  it("returns undefined structuredOutput when response is not valid JSON and schema is provided", async () => {
    mockFetch.mockResolvedValue(buildOkResponse("This is plain text, not JSON."));

    const schema = { type: "object" };
    const result = await service.generateResponse("sys", [], "query", undefined, schema);

    expect(result.structuredOutput).toBeUndefined();
  });

  it("includes history messages (user/assistant only) in the request body", async () => {
    mockFetch.mockResolvedValue(buildOkResponse("response"));

    await service.generateResponse(
      "sys",
      [
        { role: "user", content: "first" },
        { role: "assistant", content: "reply" },
        { role: "system", content: "injected system" },
      ],
      "new query"
    );

    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
    // Should have exactly 1 system message (the actual system prompt), not the injected one
    const systemMessages = body.messages.filter((m: any) => m.role === "system");
    expect(systemMessages).toHaveLength(1);
    expect(body.messages.every((m: any) => m.content !== "injected system")).toBe(true);
    expect(body.messages.some((m: any) => m.content === "first")).toBe(true);
    expect(body.messages.some((m: any) => m.content === "reply")).toBe(true);
  });
});
