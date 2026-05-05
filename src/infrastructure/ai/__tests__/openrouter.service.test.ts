import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../config/env.js", () => ({
  env: {
    OPENROUTER_API_KEY: "test-openrouter-key",
    OPENROUTER_CHAT_MODEL: "openai/gpt-4o-mini",
    LLM_REQUEST_TIMEOUT_MS: 30000,
    OPENROUTER_HTTP_REFERER: "https://myapp.com",
    OPENROUTER_APP_TITLE: "My App",
  },
}));

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.mock("node-fetch", () => ({ default: mockFetch }));

import { OpenRouterService } from "../openrouter.service.js";
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

describe("OpenRouterService", () => {
  let service: OpenRouterService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OpenRouterService("test-openrouter-key", "openai/gpt-4o-mini", 30000);
  });

  it("returns text response on successful API call", async () => {
    mockFetch.mockResolvedValue(buildOkResponse("Soy Turing."));

    const result = await service.generateResponse("system prompt", [], "hello");

    expect(result.text).toBe("Soy Turing.");
    expect(result.provider).toBe("openrouter");
    expect(result.model).toBe("openai/gpt-4o-mini");
  });

  it("sends POST to OpenRouter endpoint", async () => {
    mockFetch.mockResolvedValue(buildOkResponse("response"));

    await service.generateResponse("sys", [], "query");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("includes HTTP-Referer header when OPENROUTER_HTTP_REFERER is set", async () => {
    mockFetch.mockResolvedValue(buildOkResponse("response"));

    await service.generateResponse("sys", [], "query");

    const headers = (mockFetch.mock.calls[0][1] as any).headers;
    expect(headers["HTTP-Referer"]).toBe("https://myapp.com");
  });

  it("includes X-Title header when OPENROUTER_APP_TITLE is set", async () => {
    mockFetch.mockResolvedValue(buildOkResponse("response"));

    await service.generateResponse("sys", [], "query");

    const headers = (mockFetch.mock.calls[0][1] as any).headers;
    expect(headers["X-Title"]).toBe("My App");
  });

  it("throws LlmProviderError when API key is missing", async () => {
    const emptyKeyService = new OpenRouterService("", "model", 30000);

    await expect(emptyKeyService.generateResponse("sys", [], "query")).rejects.toThrow(LlmProviderError);
  });

  it("throws non-retryable error when API key is missing", async () => {
    const emptyKeyService = new OpenRouterService("", "model", 30000);

    await expect(emptyKeyService.generateResponse("sys", [], "query")).rejects.toMatchObject({
      retryable: false,
      provider: "openrouter",
    });
  });

  it("throws LlmProviderError on 429 rate limit (retryable)", async () => {
    mockFetch.mockResolvedValue(buildErrorResponse(429, "Rate limit exceeded"));

    await expect(service.generateResponse("sys", [], "query")).rejects.toMatchObject({
      retryable: true,
      statusCode: 429,
    });
  });

  it("throws LlmProviderError on 500 server error (retryable)", async () => {
    mockFetch.mockResolvedValue(buildErrorResponse(500));

    await expect(service.generateResponse("sys", [], "query")).rejects.toMatchObject({
      retryable: true,
      statusCode: 500,
    });
  });

  it("throws LlmProviderError when response text is empty", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ choices: [{ message: { content: "   " } }] }),
    });

    await expect(service.generateResponse("sys", [], "query")).rejects.toThrow(LlmProviderError);
  });

  it("throws with timeout message on AbortError", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValue(abortError);

    await expect(service.generateResponse("sys", [], "query")).rejects.toMatchObject({
      message: "OpenRouter agoto el tiempo de espera.",
    });
  });

  it("parses structured JSON output when responseSchema is provided", async () => {
    const jsonResponse = '{"action":"skip","reason":"off-topic"}';
    mockFetch.mockResolvedValue(buildOkResponse(jsonResponse));

    const result = await service.generateResponse("sys", [], "query", undefined, { type: "object" });

    expect(result.structuredOutput).toEqual({ action: "skip", reason: "off-topic" });
  });

  it("returns undefined structuredOutput when response is not valid JSON", async () => {
    mockFetch.mockResolvedValue(buildOkResponse("plain text response"));

    const result = await service.generateResponse("sys", [], "query", undefined, { type: "object" });

    expect(result.structuredOutput).toBeUndefined();
  });

  it("omits system-role history messages in request body", async () => {
    mockFetch.mockResolvedValue(buildOkResponse("response"));

    await service.generateResponse(
      "sys",
      [
        { role: "user", content: "user msg" },
        { role: "assistant", content: "assistant msg" },
        { role: "system", content: "injected" },
      ],
      "query"
    );

    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
    const roles = body.messages.map((m: any) => m.role);
    expect(roles.filter((r: string) => r === "system")).toHaveLength(1); // only the first system prompt
    expect(body.messages.every((m: any) => m.content !== "injected")).toBe(true);
  });
});
