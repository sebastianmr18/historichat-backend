import { Server, Socket } from "socket.io";
import { ChatFlowError, ChatService } from "../../application/services/chat.service.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { serializeError } from "../../shared/errors.js";
import { generateTraceId } from "../../shared/trace.js";
import { wsAuthMiddleware } from "./ws-auth.middleware.js";

export class ChatGateway {
  constructor(
    private io: Server,
    private chatService: ChatService
  ) {
    this.initialize();
  }

  private buildTrace(socket: Socket, event: string, conversationId?: string) {
    return {
      traceId: generateTraceId("ws"),
      socketId: socket.id,
      event,
      conversationId,
      userId: socket.data.userId as string | undefined,
    };
  }

  private decodeAudioPayload(audioBase64: string) {
    const normalized = audioBase64.includes(",")
      ? audioBase64.slice(audioBase64.indexOf(",") + 1)
      : audioBase64;
    return Buffer.from(normalized, "base64");
  }

  private toClientError(error: unknown, fallbackMessage: string) {
    if (error instanceof ChatFlowError) {
      return {
        message: error.message,
        code: error.code,
        stage: error.stage,
        retryable: error.retryable,
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message || fallbackMessage,
        code: "UNEXPECTED_ERROR",
        stage: "unknown",
        retryable: true,
      };
    }

    return {
      message: fallbackMessage,
      code: "UNEXPECTED_ERROR",
      stage: "unknown",
      retryable: true,
    };
  }

  private initialize() {
    this.registerAuthMiddleware();
    this.registerEventHandlers();
  }

  private registerAuthMiddleware() {
    this.io.use(wsAuthMiddleware);
  }

  private registerEventHandlers() {
    this.io.on("connection", (socket: Socket) => {
      logger.info("[chat.gateway] client_connected", { socketId: socket.id });

      socket.on("join_chat", (conversationId: string) => {
        socket.join(conversationId);
      });

      socket.on("send_text", async (data: { conversationId: string; text: string }) => {
        const userId = socket.data.userId as string;
        const trace = this.buildTrace(socket, "send_text", data.conversationId);
        logger.debug("[chat.gateway.send_text] received", {
          ...trace,
          textLength: data.text?.length ?? 0,
        });
        await this.handleTextFlow(socket, data.conversationId, userId, data.text, trace);
      });

      socket.on("send_audio", async (data: { conversationId: string; audioBase64: string; mimeType?: string }) => {
        const trace = this.buildTrace(socket, "send_audio", data.conversationId);
        await this.handleAudioFlow(socket, data, trace);
      });

      socket.on("disconnect", () =>
        logger.info("[chat.gateway] client_disconnected", { socketId: socket.id })
      );
    });
  }

  private async handleTextFlow(
    socket: Socket,
    conversationId: string,
    userId: string,
    text: string,
    trace?: { traceId?: string; socketId?: string; event?: string }
  ) {
    try {
      const result = await this.chatService.processTextMessage(conversationId, userId, text, trace);

      logger.debug("[chat.gateway.send_text] processed", {
        traceId: trace?.traceId,
        socketId: trace?.socketId,
        event: trace?.event,
        conversationId,
        userId,
        aiTextLength: result.text.length,
        hasAudio: Boolean(result.audioBase64),
        audioBase64Length: result.audioBase64?.length ?? 0,
      });

      this.io.to(conversationId).emit("ai_message", {
        text: result.text,
        audio: result.audioBase64,
      });

      if (result.warning) {
        socket.emit("error", result.warning);
      }
    } catch (error: any) {
      logger.error("[chat.gateway.send_text] failed", {
        traceId: trace?.traceId,
        socketId: trace?.socketId,
        event: trace?.event,
        conversationId,
        userId,
        error: serializeError(error),
      });

      socket.emit("error", this.toClientError(error, "Error procesando mensaje"));
    }
  }

  private async handleAudioFlow(
    socket: Socket,
    data: { conversationId: string; audioBase64: string; mimeType?: string },
    trace: ReturnType<ChatGateway["buildTrace"]>
  ) {
    try {
      const userId = socket.data.userId as string;
      const audioBuffer = this.decodeAudioPayload(data.audioBase64);

      logger.debug("[chat.gateway.send_audio] received", {
        ...trace,
        mimeType: data.mimeType ?? "audio/webm",
        audioBase64Length: data.audioBase64?.length ?? 0,
        audioBytes: audioBuffer.length,
      });

      const result = await this.chatService.processAudioMessage({
        conversationId: data.conversationId,
        userId,
        audioBuffer,
        mimeType: data.mimeType ?? "audio/webm",
        trace,
      });

      logger.debug("[chat.gateway.send_audio] processed", {
        ...trace,
        transcriptionLength: result.transcription.length,
        aiTextLength: result.text.length,
        hasAudio: Boolean(result.audioBase64),
        audioBase64Length: result.audioBase64?.length ?? 0,
      });

      socket.emit("transcription", { text: result.transcription });

      this.io.to(data.conversationId).emit("ai_message", {
        text: result.text,
        audio: result.audioBase64,
      });

      if (result.warning) {
        socket.emit("error", result.warning);
      }
    } catch (error: any) {
      logger.error("[chat.gateway.send_audio] failed", {
        ...trace,
        error: serializeError(error),
      });

      const clientError = this.toClientError(error, "Error procesando audio");

      if (clientError.code === "NO_SPEECH") {
        socket.emit("no_speech", { message: clientError.message });
        return;
      }

      socket.emit("error", clientError);
    }
  }
}
