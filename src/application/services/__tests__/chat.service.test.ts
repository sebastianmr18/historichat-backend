import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatService } from "../chat.service.js";
import { ChatFlowError } from "../../../domain/errors/chat-flow.error.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockGemini() {
  return {
    generateResponse: vi.fn().mockResolvedValue({
      text: "AI response text",
      provider: "gemini",
      model: "gemini-test",
    }),
  };
}

function createMockVoice() {
  return {
    synthesize: vi.fn().mockResolvedValue(Buffer.from("audio-bytes")),
    transcribe: vi.fn().mockResolvedValue("transcribed text"),
  };
}

function createMockVectorStore() {
  return {
    getContext: vi.fn().mockResolvedValue("RAG context"),
  };
}

function createMockStorage() {
  return {
    uploadFile: vi.fn().mockResolvedValue("uploaded/path.mp3"),
    getSignedUrl: vi.fn().mockResolvedValue("https://signed-url"),
    deleteFiles: vi.fn().mockResolvedValue(undefined),
  };
}

const CHARACTER_A = {
  id: "char-a",
  name: "Character A",
  role: "Historian",
  biography: "A historian",
  vectorDbName: "history_db",
  voiceId: "voice-a",
  keyTraits: [],
  speechTics: [],
  isPublic: true,
};

const CHARACTER_B = {
  id: "char-b",
  name: "Character B",
  role: "Philosopher",
  biography: "A philosopher",
  vectorDbName: "philosophy_db",
  voiceId: "voice-b",
  keyTraits: [],
  speechTics: [],
  isPublic: true,
};

// ---------------------------------------------------------------------------
// Stub AppDataSource via vi.mock
// ---------------------------------------------------------------------------

const mockMessageFind = vi.fn().mockResolvedValue([]);
const mockMessageUpdate = vi.fn().mockResolvedValue({ affected: 1 });
const mockMessageDelete = vi.fn().mockResolvedValue({ affected: 1 });
const mockConversationFindOne = vi.fn();

const mockTransactionSave = vi.fn();

function createMockConversationRepo() {
  return { findOne: mockConversationFindOne, find: vi.fn(), create: vi.fn(), save: vi.fn(), update: vi.fn(), delete: vi.fn() };
}

function createMockMessageRepo() {
  return { find: mockMessageFind, findOne: vi.fn(), create: vi.fn(), save: vi.fn(), update: mockMessageUpdate, delete: mockMessageDelete };
}

let globalSaveCounter = 0;

function createMockDataSource() {
  return {
    transaction: vi.fn(async (cb: any) => {
      const manager = {
        save: vi.fn(async (_entity: any, data: any) => {
          globalSaveCounter++;
          mockTransactionSave(data);
          return { id: globalSaveCounter, ...data };
        }),
      };
      return cb(manager);
    }),
  };
}

vi.mock("../../../infrastructure/logging/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../config/env.js", () => ({
  env: {
    SUPABASE_STORAGE_BUCKET: "test-bucket",
    DEBATE_TTS_ENABLED: true,
    DEBATE_SKIP_CONFIDENCE_THRESHOLD: 0.35,
  },
}));

vi.mock("../../prompts/system-prompt-builder.js", () => ({
  buildModeSystemPrompt: vi.fn().mockReturnValue("system prompt"),
}));

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("ChatService", () => {
  let service: ChatService;
  let mockGemini: ReturnType<typeof createMockGemini>;
  let mockVoice: ReturnType<typeof createMockVoice>;
  let mockVectorStore: ReturnType<typeof createMockVectorStore>;
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    vi.clearAllMocks();
    globalSaveCounter = 0;

    mockGemini = createMockGemini();
    mockVoice = createMockVoice();
    mockVectorStore = createMockVectorStore();
    mockStorage = createMockStorage();

    service = new ChatService(
      mockGemini as any,
      mockVoice as any,
      mockVectorStore as any,
      mockStorage as any,
      createMockConversationRepo() as any,
      createMockMessageRepo() as any,
      createMockDataSource() as any,
      "test-bucket"
    );
  });

  // -------------------------------------------------------------------------
  // processTextMessage
  // -------------------------------------------------------------------------

  describe("processTextMessage", () => {
    beforeEach(() => {
      mockConversationFindOne.mockResolvedValue({
        id: "conv-1",
        userId: "user-1",
        character: CHARACTER_A,
        secondaryCharacter: null,
      });
    });

    it("returns AI response with audio when TTS succeeds", async () => {
      const result = await service.processTextMessage("conv-1", "user-1", "Hello");

      expect(result.text).toBe("AI response text");
      expect(result.speakerId).toBe("char-a");
      expect(result.speakerName).toBe("Character A");
      expect(result.audioBase64).toBeDefined();
      expect(result.messageId).toBeDefined();
    });

    it("unwraps JSON envelope and keeps only conversational text", async () => {
      mockGemini.generateResponse.mockResolvedValueOnce({
        text: JSON.stringify({
          action: "respond",
          text: "Texto limpio para el usuario",
          confidence: 1,
        }),
        provider: "openrouter",
        model: "openrouter-test",
      });

      const result = await service.processTextMessage("conv-1", "user-1", "Hello");

      expect(result.text).toBe("Texto limpio para el usuario");
      expect(mockTransactionSave).toHaveBeenCalledWith(
        expect.objectContaining({ role: "assistant", content: "Texto limpio para el usuario" })
      );
    });

    it("throws ChatFlowError when the assistant output is code-like", async () => {
      mockGemini.generateResponse.mockResolvedValueOnce({
        text: "```ts\nconst x = 1;\n```",
        provider: "openrouter",
        model: "openrouter-test",
      });

      await expect(
        service.processTextMessage("conv-1", "user-1", "Hello")
      ).rejects.toMatchObject({ code: "AI_RESPONSE_FAILED" });
    });

    it("throws ChatFlowError when conversation is not found", async () => {
      mockConversationFindOne.mockResolvedValue(null);

      await expect(
        service.processTextMessage("conv-missing", "user-1", "Hello")
      ).rejects.toThrow(ChatFlowError);

      await expect(
        service.processTextMessage("conv-missing", "user-1", "Hello")
      ).rejects.toMatchObject({ code: "CONVERSATION_NOT_FOUND" });
    });

    it("throws ChatFlowError when AI generation fails", async () => {
      mockGemini.generateResponse.mockRejectedValue(new Error("LLM down"));

      await expect(
        service.processTextMessage("conv-1", "user-1", "Hello")
      ).rejects.toThrow(ChatFlowError);
    });

    it("returns a warning instead of audioBase64 when TTS fails", async () => {
      mockVoice.synthesize.mockRejectedValue(new Error("TTS service down"));

      const result = await service.processTextMessage("conv-1", "user-1", "Hello");

      expect(result.text).toBe("AI response text");
      expect(result.audioBase64).toBeUndefined();
      expect(result.warning).toBeDefined();
      expect(result.warning?.code).toBe("TTS_FAILED");
    });

    it("queries the vector store with the user text", async () => {
      await service.processTextMessage("conv-1", "user-1", "Tell me about Rome");

      expect(mockVectorStore.getContext).toHaveBeenCalledWith(
        "Tell me about Rome",
        "history_db"
      );
    });

    it("saves user and assistant messages in a transaction", async () => {
      await service.processTextMessage("conv-1", "user-1", "Hi there");

      expect(mockTransactionSave).toHaveBeenCalledTimes(2);
      expect(mockTransactionSave).toHaveBeenCalledWith(
        expect.objectContaining({ role: "user", content: "Hi there" })
      );
      expect(mockTransactionSave).toHaveBeenCalledWith(
        expect.objectContaining({ role: "assistant", content: "AI response text" })
      );
    });
  });

  // -------------------------------------------------------------------------
  // processAudioMessage
  // -------------------------------------------------------------------------

  describe("processAudioMessage", () => {
    beforeEach(() => {
      mockConversationFindOne.mockResolvedValue({
        id: "conv-1",
        userId: "user-1",
        character: CHARACTER_A,
        secondaryCharacter: null,
      });
    });

    it("transcribes audio, generates AI response, and returns audio", async () => {
      const result = await service.processAudioMessage({
        conversationId: "conv-1",
        userId: "user-1",
        audioBuffer: Buffer.from("fake-audio"),
        mimeType: "audio/webm",
      });

      expect(result.transcription).toBe("transcribed text");
      expect(result.text).toBe("AI response text");
      expect(result.audioBase64).toBeDefined();
      expect(mockVoice.transcribe).toHaveBeenCalled();
      expect(mockStorage.uploadFile).toHaveBeenCalled();
    });

    it("throws ChatFlowError with NO_SPEECH when transcription is empty", async () => {
      mockVoice.transcribe.mockResolvedValue("   ");

      await expect(
        service.processAudioMessage({
          conversationId: "conv-1",
          userId: "user-1",
          audioBuffer: Buffer.from("silence"),
          mimeType: "audio/webm",
        })
      ).rejects.toMatchObject({ code: "NO_SPEECH" });
    });

    it("throws ChatFlowError when STT fails", async () => {
      mockVoice.transcribe.mockRejectedValue(new Error("STT unavailable"));

      await expect(
        service.processAudioMessage({
          conversationId: "conv-1",
          userId: "user-1",
          audioBuffer: Buffer.from("audio"),
          mimeType: "audio/webm",
        })
      ).rejects.toMatchObject({ code: "STT_FAILED" });
    });

    it("throws ChatFlowError when audio upload fails", async () => {
      mockStorage.uploadFile.mockRejectedValue(new Error("Upload failed"));

      await expect(
        service.processAudioMessage({
          conversationId: "conv-1",
          userId: "user-1",
          audioBuffer: Buffer.from("audio"),
          mimeType: "audio/webm",
        })
      ).rejects.toMatchObject({ code: "AUDIO_UPLOAD_FAILED" });
    });
  });

  // -------------------------------------------------------------------------
  // processDebateAudioMessage
  // -------------------------------------------------------------------------

  describe("processDebateAudioMessage", () => {
    beforeEach(() => {
      mockConversationFindOne.mockResolvedValue({
        id: "conv-debate",
        userId: "user-1",
        character: CHARACTER_A,
        secondaryCharacter: CHARACTER_B,
        secondaryCharacterId: "char-b",
      });
    });

    it("throws ChatFlowError with NO_SPEECH when debate audio transcription is empty", async () => {
      mockVoice.transcribe.mockResolvedValue("   ");

      await expect(
        service.processDebateAudioMessage({
          conversationId: "conv-debate",
          userId: "user-1",
          audioBuffer: Buffer.from("silence"),
          mimeType: "audio/webm",
        })
      ).rejects.toMatchObject({ code: "NO_SPEECH" });
    });

    it("persists user audio metadata when debate audio is transcribed successfully", async () => {
      mockGemini.generateResponse
        .mockResolvedValueOnce({ text: "Response from A", provider: "gemini", model: "gemini-test" })
        .mockResolvedValueOnce({ text: "Response from B", provider: "gemini", model: "gemini-test" });

      await service.processDebateAudioMessage({
        conversationId: "conv-debate",
        userId: "user-1",
        audioBuffer: Buffer.from("audio"),
        mimeType: "audio/webm",
      });

      expect(mockTransactionSave).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "user",
          content: "transcribed text",
          mediaType: "audio/webm",
          audioPath: "uploaded/path.mp3",
          audioStorageId: "uploaded/path.mp3",
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // processDebateMessage
  // -------------------------------------------------------------------------

  describe("processDebateMessage", () => {
    beforeEach(() => {
      mockConversationFindOne.mockResolvedValue({
        id: "conv-debate",
        userId: "user-1",
        character: CHARACTER_A,
        secondaryCharacter: CHARACTER_B,
        secondaryCharacterId: "char-b",
      });
    });

    it("generates responses from both characters", async () => {
      mockGemini.generateResponse
        .mockResolvedValueOnce({ text: "Response from A", provider: "gemini", model: "gemini-test" })
        .mockResolvedValueOnce({ text: "Response from B", provider: "gemini", model: "gemini-test" });

      const result = await service.processDebateMessage("conv-debate", "user-1", "Discuss ethics");

      expect(result.responses).toHaveLength(2);
      expect(result.responses[0].speakerId).toBe("char-a");
      expect(result.responses[0].speakerName).toBe("Character A");
      expect(result.responses[1].speakerId).toBe("char-b");
      expect(result.responses[1].speakerName).toBe("Character B");
      expect(result.userText).toBe("Discuss ethics");
    });

    it("throws DEBATE_NOT_AVAILABLE when no secondary character", async () => {
      mockConversationFindOne.mockResolvedValue({
        id: "conv-single",
        userId: "user-1",
        character: CHARACTER_A,
        secondaryCharacter: null,
        secondaryCharacterId: null,
      });

      await expect(
        service.processDebateMessage("conv-single", "user-1", "Hello")
      ).rejects.toMatchObject({ code: "DEBATE_NOT_AVAILABLE" });
    });

    it("calls generateAiResponse for speaker B with speaker A's response in history", async () => {
      mockGemini.generateResponse
        .mockResolvedValueOnce({ text: "A says hello", provider: "gemini", model: "gemini-test" })
        .mockResolvedValueOnce({ text: "B replies", provider: "gemini", model: "gemini-test" });

      await service.processDebateMessage("conv-debate", "user-1", "Start");

      // Second Gemini call corresponds to speaker B main response.
      // Debate flow does not generate suggestions in this refactor.
      const speakerBMainCall = mockGemini.generateResponse.mock.calls[1];
      // Args: (systemPrompt, history, userText, context)
      // history is the 2nd argument
      expect(speakerBMainCall[1]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: "assistant", content: "A says hello" }),
        ])
      );
    });

    it("synthesizes audio for both speakers when DEBATE_TTS_ENABLED", async () => {
      mockGemini.generateResponse
        .mockResolvedValueOnce({ text: "A speaks", provider: "gemini", model: "gemini-test" })
        .mockResolvedValueOnce({ text: "B speaks", provider: "gemini", model: "gemini-test" });

      const result = await service.processDebateMessage("conv-debate", "user-1", "Debate!");

      expect(mockVoice.synthesize).toHaveBeenCalledTimes(2);
      expect(result.responses[0].audioBase64).toBeDefined();
      expect(result.responses[1].audioBase64).toBeDefined();
    });

    it("invokes onUserMessagePersisted callback after persisting user message", async () => {
      mockGemini.generateResponse
        .mockResolvedValueOnce({ text: "A", provider: "gemini", model: "gemini-test" })
        .mockResolvedValueOnce({ text: "B", provider: "gemini", model: "gemini-test" });

      const callbacks = {
        onUserMessagePersisted: vi.fn(),
        onTyping: vi.fn(),
        onTurnReady: vi.fn(),
        onTurnSkipped: vi.fn(),
        onRoundCompleted: vi.fn(),
      };

      await service.processDebateMessage("conv-debate", "user-1", "Hello debate", undefined, callbacks);

      expect(callbacks.onUserMessagePersisted).toHaveBeenCalledTimes(1);
      expect(callbacks.onUserMessagePersisted).toHaveBeenCalledWith(
        expect.objectContaining({ userText: "Hello debate" })
      );
      expect(callbacks.onUserMessagePersisted.mock.calls[0][0].userMessageId).toBeDefined();
    });

    it("invokes onTyping for A before onTurnReady for A, and onTyping for B before onTurnReady for B", async () => {
      mockGemini.generateResponse
        .mockResolvedValueOnce({ text: "A response", provider: "gemini", model: "gemini-test" })
        .mockResolvedValueOnce({ text: "B response", provider: "gemini", model: "gemini-test" });

      const callOrder: string[] = [];
      const callbacks = {
        onUserMessagePersisted: vi.fn(() => callOrder.push("userAck")),
        onTyping: vi.fn((p: any) => callOrder.push(`typing_${p.turnOrder}`)),
        onTurnReady: vi.fn((p: any) => callOrder.push(`turn_${p.turnOrder}`)),
        onTurnSkipped: vi.fn((p: any) => callOrder.push(`skip_${p.turnOrder}`)),
        onRoundCompleted: vi.fn(() => callOrder.push("roundComplete")),
      };

      await service.processDebateMessage("conv-debate", "user-1", "Go", undefined, callbacks);

      expect(callOrder).toEqual([
        "userAck",
        "typing_A",
        "turn_A",
        "typing_B",
        "turn_B",
        "roundComplete",
      ]);
    });

    it("includes turnOrder in onTurnReady callbacks", async () => {
      mockGemini.generateResponse
        .mockResolvedValueOnce({ text: "A", provider: "gemini", model: "gemini-test" })
        .mockResolvedValueOnce({ text: "B", provider: "gemini", model: "gemini-test" });

      const callbacks = {
        onUserMessagePersisted: vi.fn(),
        onTyping: vi.fn(),
        onTurnReady: vi.fn(),
        onTurnSkipped: vi.fn(),
        onRoundCompleted: vi.fn(),
      };

      await service.processDebateMessage("conv-debate", "user-1", "Go", undefined, callbacks);

      expect(callbacks.onTurnReady).toHaveBeenCalledTimes(2);
      expect(callbacks.onTurnReady.mock.calls[0][0]).toMatchObject({
        speakerId: "char-a",
        turnOrder: "A",
      });
      expect(callbacks.onTurnReady.mock.calls[1][0]).toMatchObject({
        speakerId: "char-b",
        turnOrder: "B",
      });
    });

    it("attaches TTS warning in onTurnReady when TTS fails for a speaker", async () => {
      mockGemini.generateResponse
        .mockResolvedValueOnce({ text: "A with audio", provider: "gemini", model: "gemini-test" })
        .mockResolvedValueOnce({ text: "B no audio", provider: "gemini", model: "gemini-test" });

      mockVoice.synthesize
        .mockResolvedValueOnce(Buffer.from("audio-a"))
        .mockRejectedValueOnce(new Error("TTS failed for B"));

      const callbacks = {
        onUserMessagePersisted: vi.fn(),
        onTyping: vi.fn(),
        onTurnReady: vi.fn(),
        onTurnSkipped: vi.fn(),
        onRoundCompleted: vi.fn(),
      };

      const result = await service.processDebateMessage("conv-debate", "user-1", "Go", undefined, callbacks);

      // Speaker A should have audio
      expect(callbacks.onTurnReady.mock.calls[0][0].audioBase64).toBeDefined();
      expect(callbacks.onTurnReady.mock.calls[0][0].warning).toBeUndefined();

      // Speaker B should have warning, no audio
      expect(callbacks.onTurnReady.mock.calls[1][0].audioBase64).toBeUndefined();
      expect(callbacks.onTurnReady.mock.calls[1][0].warning).toMatchObject({ code: "TTS_FAILED" });

      // onRoundCompleted should include the warning
      expect(callbacks.onRoundCompleted.mock.calls[0][0].warnings).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: "TTS_FAILED" })])
      );

      // Result should also reflect the warning
      expect(result.responses[1].warning).toMatchObject({ code: "TTS_FAILED" });
    });

    it("does not emit partial events when conversation is not in debate mode", async () => {
      mockConversationFindOne.mockResolvedValue({
        id: "conv-single",
        userId: "user-1",
        character: CHARACTER_A,
        secondaryCharacter: null,
        secondaryCharacterId: null,
      });

      const callbacks = {
        onUserMessagePersisted: vi.fn(),
        onTyping: vi.fn(),
        onTurnReady: vi.fn(),
        onTurnSkipped: vi.fn(),
        onRoundCompleted: vi.fn(),
      };

      await expect(
        service.processDebateMessage("conv-single", "user-1", "Hello", undefined, callbacks)
      ).rejects.toMatchObject({ code: "DEBATE_NOT_AVAILABLE" });

      expect(callbacks.onUserMessagePersisted).not.toHaveBeenCalled();
      expect(callbacks.onTyping).not.toHaveBeenCalled();
      expect(callbacks.onTurnReady).not.toHaveBeenCalled();
      expect(callbacks.onTurnSkipped).not.toHaveBeenCalled();
      expect(callbacks.onRoundCompleted).not.toHaveBeenCalled();
    });

    it("works correctly without callbacks (backward compatible)", async () => {
      mockGemini.generateResponse
        .mockResolvedValueOnce({ text: "A", provider: "gemini", model: "gemini-test" })
        .mockResolvedValueOnce({ text: "B", provider: "gemini", model: "gemini-test" });

      const result = await service.processDebateMessage("conv-debate", "user-1", "No callbacks");

      expect(result.responses).toHaveLength(2);
      expect(result.userText).toBe("No callbacks");
    });

    it("cleans up persisted messages when Speaker A generation fails", async () => {
      mockGemini.generateResponse
        .mockRejectedValueOnce(new Error("LLM down for A"));

      await expect(
        service.processDebateMessage("conv-debate", "user-1", "Fail A")
      ).rejects.toThrow();

      // User message was persisted (id=1), then A failed → cleanup should delete [1]
      expect(mockMessageDelete).toHaveBeenCalledTimes(1);
      expect(mockMessageDelete).toHaveBeenCalledWith([1]);
    });

    it("cleans up persisted messages when Speaker B generation fails after A succeeded", async () => {
      mockGemini.generateResponse
        .mockResolvedValueOnce({ text: "A ok", provider: "gemini", model: "gemini-test" })
        .mockRejectedValueOnce(new Error("LLM down for B"));

      const callbacks = {
        onUserMessagePersisted: vi.fn(),
        onTyping: vi.fn(),
        onTurnReady: vi.fn(),
        onTurnSkipped: vi.fn(),
        onRoundCompleted: vi.fn(),
      };

      await expect(
        service.processDebateMessage("conv-debate", "user-1", "Fail B", undefined, callbacks)
      ).rejects.toThrow();

      // User message (id=1) and speaker A message (id=2) were persisted → cleanup deletes both
      expect(mockMessageDelete).toHaveBeenCalledTimes(1);
      expect(mockMessageDelete).toHaveBeenCalledWith([1, 2]);

      // Speaker A turn was emitted before B failed
      expect(callbacks.onTurnReady).toHaveBeenCalledTimes(1);
      expect(callbacks.onTurnReady.mock.calls[0][0]).toMatchObject({
        speakerId: "char-a",
        turnOrder: "A",
      });

      // Round should NOT have completed
      expect(callbacks.onRoundCompleted).not.toHaveBeenCalled();
    });

    it("does not call cleanup when no messages were persisted (pre-validation failure)", async () => {
      mockConversationFindOne.mockResolvedValue({
        id: "conv-single",
        userId: "user-1",
        character: CHARACTER_A,
        secondaryCharacter: null,
        secondaryCharacterId: null,
      });

      await expect(
        service.processDebateMessage("conv-single", "user-1", "Hello")
      ).rejects.toMatchObject({ code: "DEBATE_NOT_AVAILABLE" });

      expect(mockMessageDelete).not.toHaveBeenCalled();
    });
  });
});
