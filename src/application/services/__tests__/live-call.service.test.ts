import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../infrastructure/logging/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../prompts/system-prompt-builder.js", () => ({
  buildModeSystemPrompt: vi.fn().mockReturnValue("system prompt"),
}));

import { LiveCallService } from "../live-call.service.js";

// ── Shared mock character ─────────────────────────────────────────────────────

const MOCK_CHARACTER = {
  id: "char-1",
  name: "Einstein",
  voiceId: "Kore",
  vectorDbName: "einstein_db",
  role: "Physicist",
  biography: "Discovered relativity",
  keyTraits: ["curious"],
  speechTics: [],
};

const MOCK_SESSION = { _type: "fake_gemini_session" };

// ── Factory helpers ───────────────────────────────────────────────────────────

function createMockGeminiLive() {
  return {
    connect: vi.fn().mockResolvedValue(MOCK_SESSION),
    sendAudio: vi.fn(),
    closeSession: vi.fn(),
    sendToolResponse: vi.fn(),
  };
}

function createMockCharacterRepo() {
  return {
    findOne: vi.fn().mockResolvedValue(MOCK_CHARACTER),
  };
}

function createMockVectorStore() {
  return {
    getContext: vi.fn().mockResolvedValue("RAG context"),
  };
}

function createMockEmitter() {
  return {
    emitReady: vi.fn(),
    emitAudio: vi.fn(),
    emitTranscription: vi.fn(),
    emitInterrupted: vi.fn(),
    emitError: vi.fn(),
    emitEnded: vi.fn(),
    emitSearching: vi.fn(),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("LiveCallService", () => {
  let geminiLive: ReturnType<typeof createMockGeminiLive>;
  let characterRepo: ReturnType<typeof createMockCharacterRepo>;
  let vectorStore: ReturnType<typeof createMockVectorStore>;
  let service: LiveCallService;

  beforeEach(() => {
    vi.clearAllMocks();
    geminiLive = createMockGeminiLive();
    characterRepo = createMockCharacterRepo();
    vectorStore = createMockVectorStore();
    service = new LiveCallService(geminiLive as any, vectorStore as any, characterRepo as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── startSession ──────────────────────────────────────────────────────────

  describe("startSession", () => {
    it("emits error and returns early when character is not found", async () => {
      characterRepo.findOne.mockResolvedValue(null);
      const emitter = createMockEmitter();

      await service.startSession("socket-1", "user-1", { characterId: "missing" } as any, emitter);

      expect(emitter.emitError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "CHARACTER_NOT_FOUND" }),
      );
      expect(geminiLive.connect).not.toHaveBeenCalled();
    });

    it("connects to Gemini and emits ready on success", async () => {
      const emitter = createMockEmitter();

      await service.startSession("socket-1", "user-1", { characterId: "char-1" } as any, emitter);

      expect(geminiLive.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          voiceName: "Kore",
          systemInstruction: "system prompt",
          callbacks: expect.any(Object),
        }),
      );
      expect(emitter.emitReady).toHaveBeenCalledWith(
        expect.objectContaining({ characterName: "Einstein" }),
      );
    });

    it("emits error when Gemini connection fails", async () => {
      geminiLive.connect.mockRejectedValue(new Error("Connection refused"));
      const emitter = createMockEmitter();

      await service.startSession("socket-1", "user-1", { characterId: "char-1" } as any, emitter);

      expect(emitter.emitError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "GEMINI_CONNECTION_FAILED", retryable: true }),
      );
    });

    it("cleans up existing session state before starting a new one for the same socket", async () => {
      const emitter = createMockEmitter();
      // First session
      await service.startSession("socket-1", "user-1", { characterId: "char-1" } as any, emitter);
      // Second session with same socket — should not throw and should emit ready twice
      await service.startSession("socket-1", "user-1", { characterId: "char-1" } as any, emitter);

      expect(emitter.emitReady).toHaveBeenCalledTimes(2);
    });

    it("uses DEFAULT_VOICE ('Kore') when character has no voiceId", async () => {
      characterRepo.findOne.mockResolvedValue({ ...MOCK_CHARACTER, voiceId: null });
      const emitter = createMockEmitter();

      await service.startSession("socket-1", "user-1", { characterId: "char-1" } as any, emitter);

      expect(geminiLive.connect).toHaveBeenCalledWith(
        expect.objectContaining({ voiceName: "Kore" }),
      );
    });
  });

  // ── relayAudio ────────────────────────────────────────────────────────────

  describe("relayAudio", () => {
    it("does nothing when no session exists for socket", () => {
      const audioBuffer = Buffer.from("audio-data");
      expect(() => service.relayAudio("nonexistent-socket", audioBuffer.buffer)).not.toThrow();
      expect(geminiLive.sendAudio).not.toHaveBeenCalled();
    });

    it("sends base64 audio to Gemini when session is active", async () => {
      const emitter = createMockEmitter();
      await service.startSession("socket-1", "user-1", { characterId: "char-1" } as any, emitter);

      const audioBuffer = Buffer.from("audio-data");
      service.relayAudio("socket-1", audioBuffer.buffer);

      expect(geminiLive.sendAudio).toHaveBeenCalledWith(
        MOCK_SESSION,
        expect.any(String), // base64
      );
    });
  });

  // ── stopSession ───────────────────────────────────────────────────────────

  describe("stopSession", () => {
    it("does nothing when no session exists", () => {
      expect(() => service.stopSession("nonexistent-socket")).not.toThrow();
    });

    it("closes Gemini session and emits ended", async () => {
      const emitter = createMockEmitter();
      await service.startSession("socket-1", "user-1", { characterId: "char-1" } as any, emitter);

      const stopEmitter = createMockEmitter();
      service.stopSession("socket-1", stopEmitter);

      expect(geminiLive.closeSession).toHaveBeenCalledWith(MOCK_SESSION);
      expect(stopEmitter.emitEnded).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "user_request" }),
      );
    });
  });

  // ── handleDisconnect ──────────────────────────────────────────────────────

  describe("handleDisconnect", () => {
    it("terminates session without requiring an emitter", async () => {
      const emitter = createMockEmitter();
      await service.startSession("socket-1", "user-1", { characterId: "char-1" } as any, emitter);

      expect(() => service.handleDisconnect("socket-1")).not.toThrow();
      expect(geminiLive.closeSession).toHaveBeenCalledWith(MOCK_SESSION);
    });

    it("does nothing when no session exists", () => {
      expect(() => service.handleDisconnect("no-session")).not.toThrow();
    });
  });

  // ── handleMute ────────────────────────────────────────────────────────────

  describe("handleMute", () => {
    it("does not throw when muting an active session", async () => {
      const emitter = createMockEmitter();
      await service.startSession("socket-1", "user-1", { characterId: "char-1" } as any, emitter);
      expect(() => service.handleMute("socket-1", true)).not.toThrow();
    });

    it("does not throw when there is no session to mute", () => {
      expect(() => service.handleMute("ghost-socket", false)).not.toThrow();
    });
  });

  // ── Gemini callbacks ──────────────────────────────────────────────────────

  describe("Gemini callbacks (via startSession)", () => {
    let emitter: ReturnType<typeof createMockEmitter>;
    let capturedCallbacks: any;

    beforeEach(async () => {
      emitter = createMockEmitter();
      geminiLive.connect.mockImplementation(async ({ callbacks }: { callbacks: any }) => {
        capturedCallbacks = callbacks;
        return MOCK_SESSION;
      });
      await service.startSession("socket-1", "user-1", { characterId: "char-1" } as any, emitter);
    });

    it("onAudio emits audio payload to client", () => {
      capturedCallbacks.onAudio("base64audiodata==");
      expect(emitter.emitAudio).toHaveBeenCalledWith({ audio: "base64audiodata==" });
    });

    it("onInputTranscription appends to user transcript buffer", () => {
      capturedCallbacks.onInputTranscription("Hello ");
      capturedCallbacks.onInputTranscription("world");
      capturedCallbacks.onTurnComplete();
      expect(emitter.emitTranscription).toHaveBeenCalledWith(
        expect.objectContaining({ role: "user", text: "Hello world", isFinal: true }),
      );
    });

    it("onOutputTranscription appends to model transcript buffer", () => {
      capturedCallbacks.onOutputTranscription("AI says ");
      capturedCallbacks.onOutputTranscription("something");
      capturedCallbacks.onTurnComplete();
      expect(emitter.emitTranscription).toHaveBeenCalledWith(
        expect.objectContaining({ role: "model", text: "AI says something", isFinal: true }),
      );
    });

    it("onTurnComplete flushes both user and model buffers", () => {
      capturedCallbacks.onInputTranscription("user text");
      capturedCallbacks.onOutputTranscription("model text");
      capturedCallbacks.onTurnComplete();

      const calls = emitter.emitTranscription.mock.calls;
      const roles = calls.map(([p]: [any]) => p.role);
      expect(roles).toContain("user");
      expect(roles).toContain("model");
    });

    it("onTurnComplete does not emit empty transcriptions", () => {
      capturedCallbacks.onTurnComplete(); // buffers are empty
      expect(emitter.emitTranscription).not.toHaveBeenCalled();
    });

    it("onInterrupted emits interrupted and clears model buffer", () => {
      capturedCallbacks.onOutputTranscription("partial...");
      capturedCallbacks.onInterrupted();
      expect(emitter.emitInterrupted).toHaveBeenCalled();
      // After interrupt, model buffer should be cleared – onTurnComplete emits nothing
      capturedCallbacks.onTurnComplete();
      const modelCalls = emitter.emitTranscription.mock.calls.filter(
        ([p]: [any]) => p.role === "model",
      );
      expect(modelCalls).toHaveLength(0);
    });

    it("onError emits GEMINI_SESSION_ERROR to client", () => {
      capturedCallbacks.onError(new Error("Stream error"));
      expect(emitter.emitError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "GEMINI_SESSION_ERROR", retryable: false }),
      );
    });

    it("onClose emits ended and cleans up session", () => {
      capturedCallbacks.onClose("connection_closed");
      expect(emitter.emitEnded).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "gemini_closed" }),
      );
    });
  });

  // ── RAG tool call ─────────────────────────────────────────────────────────

  describe("RAG tool call (onToolCall callback)", () => {
    let emitter: ReturnType<typeof createMockEmitter>;
    let capturedCallbacks: any;

    beforeEach(async () => {
      emitter = createMockEmitter();
      geminiLive.connect.mockImplementation(async ({ callbacks }: { callbacks: any }) => {
        capturedCallbacks = callbacks;
        return MOCK_SESSION;
      });
      await service.startSession("socket-1", "user-1", { characterId: "char-1" } as any, emitter);
    });

    it("emits searching:true then searching:false around RAG query", async () => {
      vectorStore.getContext.mockResolvedValue("relevant context");

      const fc = [{ id: "fc-1", name: "consultar_base_conocimientos", args: { query: "relativity" } }];
      await capturedCallbacks.onToolCall(fc);

      const searchingCalls = emitter.emitSearching.mock.calls.map(([p]: [any]) => p.isSearching);
      expect(searchingCalls[0]).toBe(true);
      expect(searchingCalls[searchingCalls.length - 1]).toBe(false);
    });

    it("sends tool response to Gemini with retrieved context", async () => {
      vectorStore.getContext.mockResolvedValue("discovered relativity");

      const fc = [{ id: "fc-1", name: "consultar_base_conocimientos", args: { query: "relativity" } }];
      await capturedCallbacks.onToolCall(fc);

      expect(geminiLive.sendToolResponse).toHaveBeenCalledWith(
        MOCK_SESSION,
        expect.arrayContaining([
          expect.objectContaining({
            response: expect.objectContaining({ context: "discovered relativity" }),
          }),
        ]),
      );
    });

    it("emits error and sends fallback response when RAG query fails", async () => {
      vectorStore.getContext.mockRejectedValue(new Error("Chroma down"));

      const fc = [{ id: "fc-2", name: "consultar_base_conocimientos", args: { query: "query" } }];
      await capturedCallbacks.onToolCall(fc);

      expect(emitter.emitError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "RAG_QUERY_FAILED" }),
      );
      expect(geminiLive.sendToolResponse).toHaveBeenCalled();
    });
  });

  // ── Inactivity timeout ────────────────────────────────────────────────────

  describe("inactivity timeout", () => {
    it("terminates session after 5 minutes of inactivity", async () => {
      vi.useFakeTimers();
      const emitter = createMockEmitter();
      geminiLive.connect.mockResolvedValue(MOCK_SESSION);

      await service.startSession("socket-1", "user-1", { characterId: "char-1" } as any, emitter);

      // Advance by exactly 5 minutes so the timer fires and idleMs >= INACTIVITY_TIMEOUT_MS
      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(emitter.emitEnded).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "timeout" }),
      );
    });

    it("does not terminate session within the idle threshold", async () => {
      vi.useFakeTimers();
      const emitter = createMockEmitter();
      geminiLive.connect.mockResolvedValue(MOCK_SESSION);

      await service.startSession("socket-1", "user-1", { characterId: "char-1" } as any, emitter);

      // Only 1 minute – should NOT terminate
      vi.advanceTimersByTime(60 * 1000);

      expect(emitter.emitEnded).not.toHaveBeenCalled();
    });
  });
});
