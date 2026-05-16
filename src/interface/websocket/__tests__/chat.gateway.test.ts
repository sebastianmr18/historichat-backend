import { describe, it, expect, vi, beforeEach } from "vitest";
import { Server, Socket } from "socket.io";

vi.mock("../../../infrastructure/logging/logger.js", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../ws-auth.middleware.js", () => ({
  wsAuthMiddleware: vi.fn(),
}));

import { ChatGateway } from "../chat.gateway.js";
import { ChatFlowError } from "../../../domain/errors/chat-flow.error.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockSocket(userId = "user-123"): Partial<Socket> & {
  data: Record<string, unknown>;
  emit: ReturnType<typeof vi.fn>;
  join: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  id: string;
} {
  const eventHandlers: Record<string, (...args: any[]) => void> = {};
  return {
    id: "socket-id",
    data: { userId },
    emit: vi.fn(),
    join: vi.fn(),
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      eventHandlers[event] = handler;
    }),
    _handlers: eventHandlers,
  } as any;
}

function createMockIo(): {
  io: Partial<Server>;
  connectionHandler: (...args: any[]) => void;
  emitToRoom: ReturnType<typeof vi.fn>;
  use: ReturnType<typeof vi.fn>;
} {
  let connectionHandler: (...args: any[]) => void = () => {};
  const emitToRoom = vi.fn();
  const use = vi.fn();
  const toFn = vi.fn().mockReturnValue({ emit: emitToRoom });

  const io: Partial<Server> = {
    use,
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (event === "connection") connectionHandler = handler;
    }),
    to: toFn,
  };

  return { io, get connectionHandler() { return connectionHandler; }, emitToRoom, use };
}

function createMockChatService() {
  return {
    processTextMessage: vi.fn().mockResolvedValue({
      text: "AI response",
      audioBase64: undefined,
      messageId: 42,
      suggestions: ["Question 1", "Question 2"],
      warning: undefined,
    }),
    processAudioMessage: vi.fn().mockResolvedValue({
      transcription: "what is AI?",
      text: "AI response",
      audioBase64: undefined,
      messageId: 43,
      suggestions: [],
      warning: undefined,
    }),
    processDebateMessage: vi.fn().mockResolvedValue({
      userMessageId: 10,
      responsesCount: 2,
      skipsCount: 0,
      nextSpeakerId: "char-b",
    }),
    processDebateAudioMessage: vi.fn().mockResolvedValue({
      userMessageId: 11,
      userText: "debate audio text",
      responsesCount: 1,
      skipsCount: 1,
      nextSpeakerId: "char-a",
    }),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ChatGateway", () => {
  let mockIo: ReturnType<typeof createMockIo>;
  let mockService: ReturnType<typeof createMockChatService>;
  let socket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIo = createMockIo();
    mockService = createMockChatService();
    socket = createMockSocket();
    new ChatGateway(mockIo.io as Server, mockService as any);
    // Trigger a connection with the mock socket
    mockIo.connectionHandler(socket);
  });

  describe("initialization", () => {
    it("registers wsAuthMiddleware on the io server", async () => {
      const { wsAuthMiddleware } = await import("../ws-auth.middleware.js");
      expect(mockIo.use).toHaveBeenCalledWith(wsAuthMiddleware);
    });

    it("registers connection event handler on io", () => {
      expect((mockIo.io.on as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        "connection",
        expect.any(Function)
      );
    });
  });

  describe("join_chat event", () => {
    it("joins the socket to the conversation room", () => {
      const joinChatHandler = (socket as any)._handlers["join_chat"];
      joinChatHandler("conv-123");
      expect(socket.join).toHaveBeenCalledWith("conv-123");
    });
  });

  describe("join_debate event", () => {
    it("joins the room and emits debate_started event", () => {
      const joinDebateHandler = (socket as any)._handlers["join_debate"];
      joinDebateHandler("debate-conv-456");
      expect(socket.join).toHaveBeenCalledWith("debate-conv-456");
      expect(socket.emit).toHaveBeenCalledWith(
        "debate_started",
        expect.objectContaining({ conversationId: "debate-conv-456" })
      );
    });
  });

  describe("send_text event", () => {
    it("calls chatService.processTextMessage and emits ai_message to room", async () => {
      const sendTextHandler = (socket as any)._handlers["send_text"];
      await sendTextHandler({ conversationId: "conv-1", text: "hello" });

      expect(mockService.processTextMessage).toHaveBeenCalledWith(
        "conv-1",
        "user-123",
        "hello",
        expect.anything(),
        expect.anything()
      );
      expect(mockIo.emitToRoom).toHaveBeenCalledWith(
        "ai_message",
        expect.objectContaining({ text: "AI response" })
      );
    });

    it("emits suggestions when service returns them", async () => {
      const sendTextHandler = (socket as any)._handlers["send_text"];
      await sendTextHandler({ conversationId: "conv-1", text: "hello" });

      expect(mockIo.emitToRoom).toHaveBeenCalledWith(
        "suggestions",
        expect.objectContaining({ suggestions: ["Question 1", "Question 2"] })
      );
    });

    it("emits error to socket when chatService throws", async () => {
      mockService.processTextMessage.mockRejectedValue(new Error("LLM down"));
      const sendTextHandler = (socket as any)._handlers["send_text"];
      await sendTextHandler({ conversationId: "conv-1", text: "hello" });

      expect(socket.emit).toHaveBeenCalledWith("error", expect.any(Object));
    });

    it("does not emit suggestions when the array is empty", async () => {
      mockService.processTextMessage.mockResolvedValue({
        text: "response",
        suggestions: [],
        warning: undefined,
      });
      const sendTextHandler = (socket as any)._handlers["send_text"];
      await sendTextHandler({ conversationId: "conv-1", text: "hello" });

      const suggestionCalls = (mockIo.emitToRoom as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([event]) => event === "suggestions"
      );
      expect(suggestionCalls).toHaveLength(0);
    });
  });

  describe("send_audio event", () => {
    const audioBase64 = Buffer.from("fake-audio").toString("base64");

    it("calls chatService.processAudioMessage and emits transcription and ai_message", async () => {
      const sendAudioHandler = (socket as any)._handlers["send_audio"];
      await sendAudioHandler({ conversationId: "conv-2", audioBase64 });

      expect(mockService.processAudioMessage).toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("transcription", { text: "what is AI?" });
      expect(mockIo.emitToRoom).toHaveBeenCalledWith("ai_message", expect.objectContaining({ text: "AI response" }));
    });

    it("emits no_speech event when chatService throws with NO_SPEECH code", async () => {
      const noSpeechError = new ChatFlowError("NO_SPEECH", "No speech detected", "stt", false);
      mockService.processAudioMessage.mockRejectedValue(noSpeechError);
      const sendAudioHandler = (socket as any)._handlers["send_audio"];
      await sendAudioHandler({ conversationId: "conv-2", audioBase64 });

      expect(socket.emit).toHaveBeenCalledWith("no_speech", expect.any(Object));
    });

    it("emits error when chatService throws a generic error", async () => {
      mockService.processAudioMessage.mockRejectedValue(new Error("STT failed"));
      const sendAudioHandler = (socket as any)._handlers["send_audio"];
      await sendAudioHandler({ conversationId: "conv-2", audioBase64 });

      expect(socket.emit).toHaveBeenCalledWith("error", expect.any(Object));
    });

    it("strips base64 data URI prefix when decoding audio", async () => {
      const sendAudioHandler = (socket as any)._handlers["send_audio"];
      const dataUri = `data:audio/webm;base64,${audioBase64}`;
      await sendAudioHandler({ conversationId: "conv-2", audioBase64: dataUri });

      expect(mockService.processAudioMessage).toHaveBeenCalled();
    });
  });

  describe("skip_debate_turn event", () => {
    it("emits debate_error when conversationId is missing", async () => {
      const skipHandler = (socket as any)._handlers["skip_debate_turn"];
      await skipHandler({ speaker_id: "char-a" });

      expect(socket.emit).toHaveBeenCalledWith(
        "debate_error",
        expect.objectContaining({ code: "INVALID_DEBATE_CONFIGURATION" })
      );
    });

    it("emits debate_error when speaker_id is missing", async () => {
      const skipHandler = (socket as any)._handlers["skip_debate_turn"];
      await skipHandler({ conversationId: "conv-1" });

      expect(socket.emit).toHaveBeenCalledWith(
        "debate_error",
        expect.objectContaining({ code: "INVALID_DEBATE_CONFIGURATION" })
      );
    });

    it("registers the pending manual skip and does not emit debate_error on valid input", async () => {
      const skipHandler = (socket as any)._handlers["skip_debate_turn"];
      skipHandler({ conversationId: "conv-1", speaker_id: "char-a", reason: "off-topic" });

      expect(socket.emit).not.toHaveBeenCalledWith("debate_error", expect.any(Object));
    });
  });

  describe("send_debate_text event", () => {
    it("calls chatService.processDebateMessage on valid payload", async () => {
      const sendDebateHandler = (socket as any)._handlers["send_debate_text"];
      await sendDebateHandler({ conversationId: "conv-debate", text: "debate message" });

      expect(mockService.processDebateMessage).toHaveBeenCalledWith(
        "conv-debate",
        "user-123",
        "debate message",
        expect.anything(),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it("emits debate_error to socket when processDebateMessage throws", async () => {
      mockService.processDebateMessage.mockRejectedValue(new Error("Debate failed"));
      const sendDebateHandler = (socket as any)._handlers["send_debate_text"];
      await sendDebateHandler({ conversationId: "conv-debate", text: "msg" });

      expect(socket.emit).toHaveBeenCalledWith("debate_error", expect.any(Object));
    });
  });

  describe("send_debate_audio event", () => {
    it("emits debate_error when audioBase64 is missing", async () => {
      const sendDebateAudioHandler = (socket as any)._handlers["send_debate_audio"];
      await sendDebateAudioHandler({ conversationId: "conv-debate" });

      expect(socket.emit).toHaveBeenCalledWith(
        "debate_error",
        expect.objectContaining({ code: "INVALID_AUDIO_PAYLOAD" })
      );
    });

    it("emits debate_error when audioBase64 decodes to empty buffer", async () => {
      const sendDebateAudioHandler = (socket as any)._handlers["send_debate_audio"];
      await sendDebateAudioHandler({ conversationId: "conv-debate", audioBase64: "" });

      expect(socket.emit).toHaveBeenCalledWith(
        "debate_error",
        expect.objectContaining({ code: "INVALID_AUDIO_PAYLOAD" })
      );
    });

    it("calls chatService.processDebateAudioMessage on valid audio payload", async () => {
      const validAudio = Buffer.from("audio-data").toString("base64");
      const sendDebateAudioHandler = (socket as any)._handlers["send_debate_audio"];
      await sendDebateAudioHandler({
        conversationId: "conv-debate",
        audioBase64: validAudio,
        mimeType: "audio/webm",
      });

      expect(mockService.processDebateAudioMessage).toHaveBeenCalled();
    });
  });

  describe("disconnect event", () => {
    it("registers disconnect handler without throwing", () => {
      const disconnectHandler = (socket as any)._handlers["disconnect"];
      expect(() => disconnectHandler()).not.toThrow();
    });
  });

  describe("debate callbacks (granular events)", () => {
    it("emits debate_user_ack when onUserMessagePersisted callback is invoked", async () => {
      let capturedCallbacks: any;
      mockService.processDebateMessage.mockImplementation(
        async (_cid: any, _uid: any, _text: any, _trace: any, callbacks: any) => {
          capturedCallbacks = callbacks;
          return { userMessageId: 10, responsesCount: 0, skipsCount: 0, nextSpeakerId: "char-a" };
        },
      );

      const handler = (socket as any)._handlers["send_debate_text"];
      await handler({ conversationId: "conv-1", text: "msg" });

      capturedCallbacks.onUserMessagePersisted({ userMessageId: 10, userText: "msg" });
      expect(mockIo.emitToRoom).toHaveBeenCalledWith(
        "debate_user_ack",
        expect.objectContaining({ user_message_id: 10, user_text: "msg" }),
      );
    });

    it("emits debate_typing when onTyping callback is invoked", async () => {
      let capturedCallbacks: any;
      mockService.processDebateMessage.mockImplementation(
        async (_cid: any, _uid: any, _text: any, _trace: any, callbacks: any) => {
          capturedCallbacks = callbacks;
          return { userMessageId: 10, responsesCount: 0, skipsCount: 0, nextSpeakerId: "char-a" };
        },
      );

      const handler = (socket as any)._handlers["send_debate_text"];
      await handler({ conversationId: "conv-1", text: "msg" });

      capturedCallbacks.onTyping({ speakerId: "char-a", speakerName: "Einstein", turnOrder: "first", isForced: false });
      expect(mockIo.emitToRoom).toHaveBeenCalledWith(
        "debate_typing",
        expect.objectContaining({ speaker_id: "char-a", speaker_name: "Einstein" }),
      );
    });

    it("emits debate_turn when onTurnReady callback is invoked", async () => {
      let capturedCallbacks: any;
      mockService.processDebateMessage.mockImplementation(
        async (_cid: any, _uid: any, _text: any, _trace: any, callbacks: any) => {
          capturedCallbacks = callbacks;
          return { userMessageId: 10, responsesCount: 1, skipsCount: 0, nextSpeakerId: "char-b" };
        },
      );

      const handler = (socket as any)._handlers["send_debate_text"];
      await handler({ conversationId: "conv-1", text: "msg" });

      capturedCallbacks.onTurnReady({
        messageId: 42,
        text: "Response text",
        speakerId: "char-a",
        speakerName: "Einstein",
        turnOrder: "first",
        isForced: false,
        inference_method: "explicit",
        audio: undefined,
        warning: undefined,
      });
      expect(mockIo.emitToRoom).toHaveBeenCalledWith(
        "debate_turn",
        expect.objectContaining({ message_id: 42, text: "Response text", speaker_id: "char-a" }),
      );
    });

    it("emits debate_turn_skipped when onTurnSkipped callback is invoked", async () => {
      let capturedCallbacks: any;
      mockService.processDebateMessage.mockImplementation(
        async (_cid: any, _uid: any, _text: any, _trace: any, callbacks: any) => {
          capturedCallbacks = callbacks;
          return { userMessageId: 10, responsesCount: 0, skipsCount: 1, nextSpeakerId: "char-b" };
        },
      );

      const handler = (socket as any)._handlers["send_debate_text"];
      await handler({ conversationId: "conv-1", text: "msg" });

      capturedCallbacks.onTurnSkipped({
        messageId: 55,
        speakerId: "char-a",
        speakerName: "Einstein",
        turnOrder: "first",
        reason: "strategy",
        reasonDetail: "Not applicable",
        confidence: 0.8,
        isForced: false,
        inference_method: "explicit",
      });
      expect(mockIo.emitToRoom).toHaveBeenCalledWith(
        "debate_turn_skipped",
        expect.objectContaining({ message_id: 55, speaker_id: "char-a", reason: "strategy" }),
      );
    });

    it("emits debate_round_complete when onRoundCompleted callback is invoked", async () => {
      let capturedCallbacks: any;
      mockService.processDebateMessage.mockImplementation(
        async (_cid: any, _uid: any, _text: any, _trace: any, callbacks: any) => {
          capturedCallbacks = callbacks;
          return { userMessageId: 10, responsesCount: 2, skipsCount: 0, nextSpeakerId: "char-b" };
        },
      );

      const handler = (socket as any)._handlers["send_debate_text"];
      await handler({ conversationId: "conv-1", text: "msg" });

      capturedCallbacks.onRoundCompleted({
        responsesCount: 2,
        skipsCount: 0,
        nextSpeakerId: "char-b",
        inference_method: "explicit",
        selected_speaker_id: "char-b",
        warnings: [],
        inferenceDetails: { method: "explicit", selectedSpeakerId: "char-b" },
      });
      expect(mockIo.emitToRoom).toHaveBeenCalledWith(
        "debate_round_complete",
        expect.objectContaining({ responses_count: 2, next_speaker_id: "char-b" }),
      );
    });

    it("consumePendingManualSkips consumes and clears stored skips", async () => {
      // Register a skip for a speaker
      const skipHandler = (socket as any)._handlers["skip_debate_turn"];
      skipHandler({ conversationId: "conv-skip", speaker_id: "char-a", reason: "off-topic" });

      let manualSkipsPassedToService: any;
      mockService.processDebateMessage.mockImplementation(
        async (_cid: any, _uid: any, _text: any, _trace: any, _cbs: any, opts: any) => {
          manualSkipsPassedToService = opts?.manualSkips;
          return { userMessageId: 1, responsesCount: 0, skipsCount: 0, nextSpeakerId: "char-b" };
        },
      );

      const handler = (socket as any)._handlers["send_debate_text"];
      await handler({ conversationId: "conv-skip", text: "test" });

      expect(manualSkipsPassedToService).toEqual({ "char-a": "off-topic" });

      // Second call – skips should be gone
      manualSkipsPassedToService = undefined;
      await handler({ conversationId: "conv-skip", text: "test2" });
      expect(manualSkipsPassedToService).toEqual({});
    });
  });
});
