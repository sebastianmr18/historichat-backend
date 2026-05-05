import { describe, it, expect, vi, beforeEach } from "vitest";
import { Server, Namespace, Socket } from "socket.io";

vi.mock("../../../infrastructure/logging/logger.js", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../ws-auth.middleware.js", () => ({
  wsAuthMiddleware: vi.fn(),
}));

vi.mock("../../../shared/trace.js", () => ({
  generateTraceId: vi.fn().mockReturnValue("trace-live-001"),
}));

vi.mock("../../../shared/errors.js", () => ({
  serializeError: vi.fn().mockImplementation((e: any) => ({ message: e?.message ?? "error" })),
}));

import { LiveGateway } from "../live.gateway.js";

// ── Helpers ────────────────────────────────────────────────────────────────────

function createMockSocket(userId = "user-live-1"): any {
  const eventHandlers: Record<string, (...args: any[]) => void> = {};
  const mockSocket: any = {
    id: "live-socket-1",
    data: { userId },
    emit: vi.fn(),
    volatile: { emit: vi.fn() },
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      eventHandlers[event] = handler;
    }),
    _handlers: eventHandlers,
  };
  return mockSocket;
}

function createMockNamespace(): {
  namespace: Partial<Namespace>;
  connectionHandler: (...args: any[]) => void;
  use: ReturnType<typeof vi.fn>;
} {
  let connectionHandler: (...args: any[]) => void = () => {};
  const use = vi.fn();
  const on = vi.fn((event: string, handler: (...args: any[]) => void) => {
    if (event === "connection") connectionHandler = handler;
  });

  const namespace: Partial<Namespace> = { use, on } as any;
  return {
    namespace,
    get connectionHandler() {
      return connectionHandler;
    },
    use,
  };
}

function createMockIo(ns: Partial<Namespace>): Partial<Server> {
  return {
    of: vi.fn().mockReturnValue(ns),
  } as any;
}

function createMockLiveCallService() {
  return {
    startSession: vi.fn().mockResolvedValue(undefined),
    relayAudio: vi.fn(),
    stopSession: vi.fn(),
    handleDisconnect: vi.fn(),
    handleMute: vi.fn(),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("LiveGateway", () => {
  let mockNs: ReturnType<typeof createMockNamespace>;
  let mockService: ReturnType<typeof createMockLiveCallService>;
  let socket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNs = createMockNamespace();
    mockService = createMockLiveCallService();
    socket = createMockSocket();

    const io = createMockIo(mockNs.namespace);
    new LiveGateway(io as Server, mockService as any);

    // Simulate a client connection
    mockNs.connectionHandler(socket);
  });

  describe("initialization", () => {
    it("registers the gateway on the /live namespace", () => {
      const mockNs2 = createMockNamespace();
      const io = createMockIo(mockNs2.namespace) as any;
      new LiveGateway(io as Server, mockService as any);
      expect(io.of).toHaveBeenCalledWith("/live");
    });

    it("applies wsAuthMiddleware to the namespace", async () => {
      const { wsAuthMiddleware } = await import("../ws-auth.middleware.js");
      expect(mockNs.use).toHaveBeenCalledWith(wsAuthMiddleware);
    });

    it("registers a connection event handler", () => {
      expect((mockNs.namespace.on as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        "connection",
        expect.any(Function),
      );
    });
  });

  describe("live:start event", () => {
    it("delegates to liveCallService.startSession with correct args", async () => {
      const startHandler = socket._handlers["live:start"];
      await startHandler({ characterId: "char-1", systemInstruction: "..." });

      expect(mockService.startSession).toHaveBeenCalledWith(
        "live-socket-1",
        "user-live-1",
        expect.objectContaining({ characterId: "char-1" }),
        expect.any(Object), // emitter
      );
    });

    it("emits live:error when startSession throws", async () => {
      mockService.startSession.mockRejectedValue(new Error("Unexpected error"));
      const startHandler = socket._handlers["live:start"];
      await startHandler({ characterId: "char-1" });

      expect(socket.emit).toHaveBeenCalledWith(
        "live:error",
        expect.objectContaining({ code: "INTERNAL_ERROR", retryable: true }),
      );
    });
  });

  describe("live:audio event", () => {
    it("delegates to liveCallService.relayAudio", () => {
      const audioHandler = socket._handlers["live:audio"];
      const buffer = new ArrayBuffer(16);
      audioHandler(buffer);

      expect(mockService.relayAudio).toHaveBeenCalledWith("live-socket-1", buffer);
    });
  });

  describe("live:stop event", () => {
    it("delegates to liveCallService.stopSession", () => {
      const stopHandler = socket._handlers["live:stop"];
      stopHandler();

      expect(mockService.stopSession).toHaveBeenCalledWith(
        "live-socket-1",
        expect.any(Object), // emitter
      );
    });
  });

  describe("live:mute event", () => {
    it("delegates to liveCallService.handleMute with muted state", () => {
      const muteHandler = socket._handlers["live:mute"];
      muteHandler({ muted: true });

      expect(mockService.handleMute).toHaveBeenCalledWith("live-socket-1", true);
    });
  });

  describe("disconnect event", () => {
    it("delegates to liveCallService.handleDisconnect", () => {
      const disconnectHandler = socket._handlers["disconnect"];
      disconnectHandler();

      expect(mockService.handleDisconnect).toHaveBeenCalledWith("live-socket-1");
    });
  });

  describe("emitter builder", () => {
    it("emitter functions emit the correct socket events", async () => {
      let capturedEmitter: any;
      mockService.startSession.mockImplementation(
        async (_socketId: string, _userId: string, _payload: any, emitter: any) => {
          capturedEmitter = emitter;
        },
      );

      const startHandler = socket._handlers["live:start"];
      await startHandler({ characterId: "char-1" });

      capturedEmitter.emitReady({ sessionId: "s1", voiceName: "Kore", characterName: "Einstein" });
      expect(socket.emit).toHaveBeenCalledWith("live:ready", expect.any(Object));

      capturedEmitter.emitError({ code: "X", message: "msg", retryable: false });
      expect(socket.emit).toHaveBeenCalledWith("live:error", expect.any(Object));

      capturedEmitter.emitEnded({ reason: "user_request", durationMs: 5000 });
      expect(socket.emit).toHaveBeenCalledWith("live:ended", expect.any(Object));

      capturedEmitter.emitTranscription({ role: "user", text: "hello", isFinal: true });
      expect(socket.emit).toHaveBeenCalledWith("live:transcription", expect.any(Object));

      capturedEmitter.emitSearching({ isSearching: true });
      expect(socket.emit).toHaveBeenCalledWith("live:searching", expect.any(Object));

      capturedEmitter.emitInterrupted();
      // volatile emit – just check it doesn't throw
    });
  });
});
