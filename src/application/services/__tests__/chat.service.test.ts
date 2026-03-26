import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatService } from "../chat.service.js";
import { ChatFlowError } from "../../../domain/errors/chat-flow.error.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockGemini() {
  return {
    generateResponse: vi.fn().mockResolvedValue("AI response text"),
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
const mockConversationFindOne = vi.fn();

const mockTransactionSave = vi.fn();

function createMockConversationRepo() {
  return { findOne: mockConversationFindOne, find: vi.fn(), create: vi.fn(), save: vi.fn(), update: vi.fn(), delete: vi.fn() };
}

function createMockMessageRepo() {
  return { find: mockMessageFind, findOne: vi.fn(), create: vi.fn(), save: vi.fn(), update: mockMessageUpdate, delete: vi.fn() };
}

function createMockDataSource() {
  return {
    transaction: vi.fn(async (cb: any) => {
      let callCount = 0;
      const manager = {
        save: vi.fn(async (_entity: any, data: any) => {
          callCount++;
          mockTransactionSave(data);
          return { id: callCount, ...data };
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
  },
}));

vi.mock("../../prompts/character-prompt.js", () => ({
  buildSystemPrompt: vi.fn().mockReturnValue("system prompt"),
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
        .mockResolvedValueOnce("Response from A")
        .mockResolvedValueOnce("Response from B");

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
        .mockResolvedValueOnce("A says hello")
        .mockResolvedValueOnce("B replies");

      await service.processDebateMessage("conv-debate", "user-1", "Start");

      // Second call should include speaker A's response in the history
      const secondCallHistory = mockGemini.generateResponse.mock.calls[1];
      // Args: (systemPrompt, history, userText, context)
      // history is the 2nd argument
      expect(secondCallHistory[1]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: "assistant", content: "A says hello" }),
        ])
      );
    });

    it("synthesizes audio for both speakers when DEBATE_TTS_ENABLED", async () => {
      mockGemini.generateResponse
        .mockResolvedValueOnce("A speaks")
        .mockResolvedValueOnce("B speaks");

      const result = await service.processDebateMessage("conv-debate", "user-1", "Debate!");

      expect(mockVoice.synthesize).toHaveBeenCalledTimes(2);
      expect(result.responses[0].audioBase64).toBeDefined();
      expect(result.responses[1].audioBase64).toBeDefined();
    });
  });
});
