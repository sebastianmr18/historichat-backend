import { Server, Socket } from "socket.io";
import { ChatService } from "../../application/services/chat.service.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { serializeError } from "../../shared/errors.js";
import { generateTraceId } from "../../shared/trace.js";
import { toClientError } from "../../shared/ws-errors.js";
import { normalizeConversationMode } from "../../shared/conversation-mode.js";
import {
  ConversationMode,
  DebateProgressCallbacks,
  DebateRoundCompletePayload,
  SendDebateAudioPayload,
  DebateTurnSkippedPayload,
  DebateTurnPayload,
  DebateTypingPayload,
  DebateUserAckPayload,
  LegacyConversationMode,
  SendDebateTextPayload,
  SkipDebateTurnPayload,
} from "../../shared/types.js";
import { wsAuthMiddleware } from "./ws-auth.middleware.js";

export class ChatGateway {
  private readonly pendingManualSkips = new Map<string, Map<string, string | undefined>>();

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

  private emitAiMessage(conversationId: string, result: { text: string; audioBase64?: string; messageId?: number; speakerId?: string; speakerName?: string }) {
    this.io.to(conversationId).emit("ai_message", {
      text: result.text,
      audio: result.audioBase64,
      message_id: result.messageId,
      speaker_id: result.speakerId,
      speaker_name: result.speakerName,
    });
  }

  private emitSuggestions(conversationId: string, suggestions?: string[]) {
    if (!suggestions || suggestions.length === 0) {
      return;
    }
    this.io.to(conversationId).emit("suggestions", {
      conversationId,
      suggestions,
    });
  }

  // --- Granular debate event emitters ---

  private emitDebateUserAck(conversationId: string, payload: DebateUserAckPayload) {
    this.io.to(conversationId).emit("debate_user_ack", {
      conversationId: payload.conversationId,
      traceId: payload.traceId,
      user_message_id: payload.userMessageId,
      user_text: payload.userText,
    });
  }

  private emitDebateTyping(conversationId: string, payload: DebateTypingPayload) {
    this.io.to(conversationId).emit("debate_typing", {
      conversationId: payload.conversationId,
      traceId: payload.traceId,
      speaker_id: payload.speakerId,
      speaker_name: payload.speakerName,
      turn_order: payload.turnOrder,
      is_forced: payload.isForced ?? false,
    });
  }

  private emitDebateTurn(conversationId: string, payload: DebateTurnPayload) {
    this.io.to(conversationId).emit("debate_turn", {
      conversationId: payload.conversationId,
      traceId: payload.traceId,
      message_id: payload.messageId,
      text: payload.text,
      speaker_id: payload.speakerId,
      speaker_name: payload.speakerName,
      turn_order: payload.turnOrder,
      is_forced: payload.isForced ?? false,
      audio: payload.audio,
      warning: payload.warning,
    });
  }

  private emitDebateTurnSkipped(conversationId: string, payload: DebateTurnSkippedPayload) {
    this.io.to(conversationId).emit("debate_turn_skipped", {
      conversationId: payload.conversationId,
      traceId: payload.traceId,
      speaker_id: payload.speakerId,
      speaker_name: payload.speakerName,
      turn_order: payload.turnOrder,
      reason: payload.reason,
      reason_detail: payload.reasonDetail,
      confidence: payload.confidence,
      is_forced: payload.isForced ?? false,
    });
  }

  private emitDebateRoundComplete(conversationId: string, payload: DebateRoundCompletePayload) {
    this.io.to(conversationId).emit("debate_round_complete", {
      conversationId: payload.conversationId,
      traceId: payload.traceId,
      responses_count: payload.responsesCount,
      skips_count: payload.skipsCount,
      next_speaker_id: payload.nextSpeakerId,
      warnings: payload.warnings,
    });
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

      socket.on("join_debate", (conversationId: string) => {
        const trace = this.buildTrace(socket, "join_debate", conversationId);
        socket.join(conversationId);
        socket.emit("debate_started", {
          conversationId,
          traceId: trace.traceId,
        });
      });

      socket.on("send_text", async (data: { conversationId: string; text: string; mode?: LegacyConversationMode }) => {
        const userId = socket.data.userId as string;
        const trace = this.buildTrace(socket, "send_text", data.conversationId);
        const normalizedMode = normalizeConversationMode(data.mode);
        logger.debug("[chat.gateway.send_text] received", {
          ...trace,
          textLength: data.text?.length ?? 0,
          modeOriginal: normalizedMode.originalMode ?? null,
          modeEffective: normalizedMode.effectiveMode,
        });
        await this.handleTextFlow(socket, data.conversationId, userId, data.text, normalizedMode.effectiveMode, trace);
      });

      socket.on("send_audio", async (data: { conversationId: string; audioBase64: string; mimeType?: string; mode?: LegacyConversationMode }) => {
        const trace = this.buildTrace(socket, "send_audio", data.conversationId);
        const normalizedMode = normalizeConversationMode(data.mode);
        logger.debug("[chat.gateway.send_audio] received", {
          ...trace,
          modeOriginal: normalizedMode.originalMode ?? null,
          modeEffective: normalizedMode.effectiveMode,
        });
        await this.handleAudioFlow(socket, { ...data, mode: normalizedMode.effectiveMode }, trace);
      });

      socket.on("send_debate_text", async (data: SendDebateTextPayload) => {
        const userId = socket.data.userId as string;
        const trace = this.buildTrace(socket, "send_debate_text", data.conversationId);
        logger.debug("[chat.gateway.send_debate_text] received", {
          ...trace,
          textLength: data.text?.length ?? 0,
          forcedSpeakerId: data.forced_speaker_id ?? null,
        });
        await this.handleDebateTextFlow(socket, data, userId, trace);
      });

      socket.on("send_debate_audio", async (data: SendDebateAudioPayload) => {
        const userId = socket.data.userId as string;
        const trace = this.buildTrace(socket, "send_debate_audio", data.conversationId);
        logger.debug("[chat.gateway.send_debate_audio] received", {
          ...trace,
          hasAudioPayload: Boolean(data.audioBase64),
          audioBase64Length: data.audioBase64?.length ?? 0,
          mimeType: data.mimeType ?? "audio/webm",
          forcedSpeakerId: data.forced_speaker_id ?? null,
        });
        await this.handleDebateAudioFlow(socket, data, userId, trace);
      });

      socket.on("skip_debate_turn", async (data: SkipDebateTurnPayload) => {
        const trace = this.buildTrace(socket, "skip_debate_turn", data.conversationId);
        logger.debug("[chat.gateway.skip_debate_turn] received", {
          ...trace,
          speakerId: data.speaker_id,
        });

        if (!data.conversationId || !data.speaker_id) {
          socket.emit("debate_error", {
            traceId: trace.traceId,
            code: "INVALID_DEBATE_CONFIGURATION",
            message: "conversationId y speaker_id son requeridos",
            stage: "validation",
            retryable: false,
          });
          return;
        }

        const byConversation = this.pendingManualSkips.get(data.conversationId) ?? new Map<string, string | undefined>();
        byConversation.set(data.speaker_id, data.reason);
        this.pendingManualSkips.set(data.conversationId, byConversation);
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
    mode?: ConversationMode,
    trace?: { traceId?: string; socketId?: string; event?: string }
  ) {
    try {
      const result = await this.chatService.processTextMessage(conversationId, userId, text, mode, trace);

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

      this.emitAiMessage(conversationId, result);

      this.emitSuggestions(conversationId, result.suggestions);

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

      socket.emit("error", toClientError(error, "Error procesando mensaje"));
    }
  }

  private async handleAudioFlow(
    socket: Socket,
    data: { conversationId: string; audioBase64: string; mimeType?: string; mode?: ConversationMode },
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
        mode: data.mode,
      });

      logger.debug("[chat.gateway.send_audio] processed", {
        ...trace,
        transcriptionLength: result.transcription.length,
        aiTextLength: result.text.length,
        hasAudio: Boolean(result.audioBase64),
        audioBase64Length: result.audioBase64?.length ?? 0,
      });

      socket.emit("transcription", { text: result.transcription });

      this.emitAiMessage(data.conversationId, result);

      this.emitSuggestions(data.conversationId, result.suggestions);

      if (result.warning) {
        socket.emit("error", result.warning);
      }
    } catch (error: any) {
      logger.error("[chat.gateway.send_audio] failed", {
        ...trace,
        error: serializeError(error),
      });

      const clientError = toClientError(error, "Error procesando audio");

      if (clientError.code === "NO_SPEECH") {
        socket.emit("no_speech", { message: clientError.message });
        return;
      }

      socket.emit("error", clientError);
    }
  }

  private async handleDebateTextFlow(
    socket: Socket,
    payload: SendDebateTextPayload,
    userId: string,
    trace: ReturnType<ChatGateway["buildTrace"]>
  ) {
    const conversationId = payload.conversationId;
    const text = payload.text;
    const traceId = trace.traceId ?? generateTraceId("ws");
    const manualSkips = this.consumePendingManualSkips(conversationId);
    const callbacks = this.createDebateCallbacks(conversationId, traceId);

    try {
      const result = await this.chatService.processDebateMessage(
        conversationId,
        userId,
        text,
        trace,
        callbacks,
        {
          forcedSpeakerId: payload.forced_speaker_id,
          manualSkips,
        }
      );

      logger.debug("[chat.gateway.send_debate_text] processed", {
        ...trace,
        userMessageId: result.userMessageId,
        responseCount: result.responsesCount,
        skipsCount: result.skipsCount,
        nextSpeakerId: result.nextSpeakerId,
      });
    } catch (error) {
      logger.error("[chat.gateway.send_debate_text] failed", {
        ...trace,
        conversationId,
        userId,
        error: serializeError(error),
      });

      socket.emit("debate_error", {
        traceId,
        ...toClientError(error, "Error procesando turno de debate"),
      });
    }
  }

  private async handleDebateAudioFlow(
    socket: Socket,
    payload: SendDebateAudioPayload,
    userId: string,
    trace: ReturnType<ChatGateway["buildTrace"]>
  ) {
    const conversationId = payload.conversationId;
    const traceId = trace.traceId ?? generateTraceId("ws");

    if (!payload.audioBase64) {
      socket.emit("debate_error", {
        traceId,
        code: "INVALID_AUDIO_PAYLOAD",
        message: "audioBase64 es requerido",
        stage: "validation",
        retryable: false,
      });
      return;
    }

    const manualSkips = this.consumePendingManualSkips(conversationId);
    const callbacks = this.createDebateCallbacks(conversationId, traceId);

    try {
      const audioBuffer = this.decodeAudioPayload(payload.audioBase64);
      if (audioBuffer.length === 0) {
        socket.emit("debate_error", {
          traceId,
          code: "INVALID_AUDIO_PAYLOAD",
          message: "audioBase64 no contiene datos validos",
          stage: "validation",
          retryable: false,
        });
        return;
      }

      logger.debug("[chat.gateway.send_debate_audio] decoded", {
        ...trace,
        mimeType: payload.mimeType ?? "audio/webm",
        audioBytes: audioBuffer.length,
      });

      const result = await this.chatService.processDebateAudioMessage({
        conversationId,
        userId,
        audioBuffer,
        mimeType: payload.mimeType ?? "audio/webm",
        trace,
        callbacks,
        forcedSpeakerId: payload.forced_speaker_id,
        manualSkips,
      });

      logger.debug("[chat.gateway.send_debate_audio] processed", {
        ...trace,
        userMessageId: result.userMessageId,
        transcriptionLength: result.userText.length,
        responseCount: result.responsesCount,
        skipsCount: result.skipsCount,
        nextSpeakerId: result.nextSpeakerId,
      });
    } catch (error) {
      logger.error("[chat.gateway.send_debate_audio] failed", {
        ...trace,
        conversationId,
        userId,
        error: serializeError(error),
      });

      socket.emit("debate_error", {
        traceId,
        ...toClientError(error, "Error procesando audio de debate"),
      });
    }
  }

  private consumePendingManualSkips(conversationId: string): Record<string, string | undefined> {
    const pendingSkips = this.pendingManualSkips.get(conversationId);
    const manualSkips = pendingSkips ? Object.fromEntries(pendingSkips.entries()) : {};
    if (pendingSkips) {
      this.pendingManualSkips.delete(conversationId);
    }
    return manualSkips;
  }

  private createDebateCallbacks(conversationId: string, traceId: string): DebateProgressCallbacks {
    return {
      onUserMessagePersisted: (payload) => {
        this.emitDebateUserAck(conversationId, {
          conversationId,
          traceId,
          userMessageId: payload.userMessageId,
          userText: payload.userText,
        });
      },
      onTyping: (payload) => {
        this.emitDebateTyping(conversationId, {
          conversationId,
          traceId,
          speakerId: payload.speakerId,
          speakerName: payload.speakerName,
          turnOrder: payload.turnOrder,
          isForced: payload.isForced,
        });
      },
      onTurnReady: (payload) => {
        if (!payload.messageId || !payload.text) {
          return;
        }

        const turnPayload: DebateTurnPayload = {
          conversationId,
          traceId,
          messageId: payload.messageId,
          text: payload.text,
          speakerId: payload.speakerId,
          speakerName: payload.speakerName,
          turnOrder: payload.turnOrder,
          isForced: payload.isForced,
          audio: payload.audioBase64,
          warning: payload.warning,
        };
        this.emitDebateTurn(conversationId, turnPayload);
      },
      onTurnSkipped: (payload) => {
        this.emitDebateTurnSkipped(conversationId, {
          conversationId,
          traceId,
          speakerId: payload.speakerId,
          speakerName: payload.speakerName,
          turnOrder: payload.turnOrder,
          reason: payload.reason,
          reasonDetail: payload.reasonDetail,
          confidence: payload.confidence,
          isForced: payload.isForced,
        });
      },
      onRoundCompleted: (payload) => {
        this.emitDebateRoundComplete(conversationId, {
          conversationId,
          traceId,
          responsesCount: payload.responsesCount,
          skipsCount: payload.skipsCount,
          nextSpeakerId: payload.nextSpeakerId,
          warnings: payload.warnings,
        });
      },
      onSuggestionsReady: (payload) => {
        this.emitSuggestions(conversationId, payload.suggestions);
      },
    };
  }
}
