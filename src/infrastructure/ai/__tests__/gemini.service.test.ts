import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../config/env.js", () => ({
  env: {
    GEMINI_API_KEY: "test-gemini-key",
    GEMINI_CHAT_MODEL: "gemini-2.0-flash",
  },
}));

vi.mock("../../logging/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../application/prompts/user-prompt-builder.js", () => ({
  buildFinalUserPrompt: vi.fn().mockImplementation((query: string, context?: string) =>
    context ? `[CTX:${context}] ${query}` : query,
  ),
}));

const { mockSendMessage, mockStartChat, mockGetGenerativeModel } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
  mockStartChat: vi.fn(),
  mockGetGenerativeModel: vi.fn(),
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function (this: any) {
    this.getGenerativeModel = mockGetGenerativeModel;
  }),
}));

import { GeminiService } from "../gemini.service.js";
import { LlmProviderError } from "../llm-provider.interface.js";

function buildMockResponse(text: string) {
  return {
    response: { text: () => text },
  };
}

describe("GeminiService", () => {
  let service: GeminiService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGenerativeModel.mockReturnValue({ startChat: mockStartChat });
    mockStartChat.mockReturnValue({ sendMessage: mockSendMessage });
    mockSendMessage.mockResolvedValue(buildMockResponse("Gemini response"));
    service = new GeminiService();
  });

  describe("provider metadata", () => {
    it("exposes providerName as 'gemini'", () => {
      expect(service.providerName).toBe("gemini");
    });

    it("exposes modelName from env", () => {
      expect(service.modelName).toBe("gemini-2.0-flash");
    });
  });

  describe("generateResponse – happy path", () => {
    it("returns text response on successful API call", async () => {
      const result = await service.generateResponse("system prompt", [], "hello");
      expect(result.text).toBe("Gemini response");
      expect(result.provider).toBe("gemini");
      expect(result.model).toBe("gemini-2.0-flash");
    });

    it("initializes chat with systemInstruction from systemPrompt", async () => {
      await service.generateResponse("Be a historian", [], "query");
      expect(mockStartChat).toHaveBeenCalledWith(
        expect.objectContaining({
          systemInstruction: expect.objectContaining({
            role: "system",
            parts: [{ text: "Be a historian" }],
          }),
        }),
      );
    });

    it("maps assistant history role to 'model' for the Gemini SDK", async () => {
      const history = [
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "Hi there" },
      ];
      await service.generateResponse("sys", history, "continue");
      expect(mockStartChat).toHaveBeenCalledWith(
        expect.objectContaining({
          history: expect.arrayContaining([
            expect.objectContaining({ role: "model", parts: [{ text: "Hi there" }] }),
          ]),
        }),
      );
    });

    it("discards history entries before the first user message", async () => {
      const history = [
        { role: "assistant" as const, content: "Stray assistant message" },
        { role: "user" as const, content: "First user message" },
      ];
      await service.generateResponse("sys", history, "follow-up");
      const callHistory = mockStartChat.mock.calls[0][0].history;
      expect(callHistory[0].role).toBe("user");
    });

    it("starts chat with empty history when no user message exists in history", async () => {
      const history = [{ role: "assistant" as const, content: "Only assistant" }];
      await service.generateResponse("sys", history, "query");
      const callHistory = mockStartChat.mock.calls[0][0].history;
      expect(callHistory).toHaveLength(0);
    });
  });

  describe("generateResponse – structured output (responseSchema)", () => {
    it("parses and returns structuredOutput when responseSchema is provided", async () => {
      const structured = { action: "respond", text: "Structured text", confidence: 1 };
      mockSendMessage.mockResolvedValue(buildMockResponse(JSON.stringify(structured)));

      const result = await service.generateResponse("sys", [], "query", undefined, { type: "object" });

      expect(result.structuredOutput).toEqual(structured);
      expect(result.text).toBe(JSON.stringify(structured));
    });

    it("returns raw text without structuredOutput when JSON parse fails", async () => {
      mockSendMessage.mockResolvedValue(buildMockResponse("not valid json {{"));

      const result = await service.generateResponse("sys", [], "query", undefined, { type: "object" });

      expect(result.structuredOutput).toBeUndefined();
      expect(result.text).toBe("not valid json {{");
    });

    it("uses a separate model instance when responseSchema is provided", async () => {
      await service.generateResponse("sys", [], "query", undefined, { type: "object" });
      // getGenerativeModel should be called at construction (1x default + 1x schema model)
      expect(mockGetGenerativeModel).toHaveBeenCalledTimes(2);
    });
  });

  describe("generateResponse – error handling", () => {
    it("throws LlmProviderError when sendMessage rejects", async () => {
      mockSendMessage.mockRejectedValue(new Error("API rate limit"));

      await expect(service.generateResponse("sys", [], "query")).rejects.toThrow(LlmProviderError);
    });

    it("marks the LlmProviderError as retryable", async () => {
      mockSendMessage.mockRejectedValue(new Error("network error"));

      await expect(service.generateResponse("sys", [], "query")).rejects.toMatchObject({
        retryable: true,
        provider: "gemini",
      });
    });
  });
});
