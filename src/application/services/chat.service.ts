import { AppDataSource } from "../../config/database.js";
import { Character } from "../../infrastructure/database/entities/Character.js";
import { Conversation } from "../../infrastructure/database/entities/Conversation.js";
import { Message } from "../../infrastructure/database/entities/Message.js";
import { GeminiService } from "../../infrastructure/ai/gemini.service.js";
import { ChatResponse, IStorageService, ITextToSpeech, ISpeechToText, MessageBlock, MessageSchemaVersion, ProcessAudioMessageInput, RequestTraceContext } from "../../shared/types.js";
import { ChromaRepository } from "../../infrastructure/vector/chroma.repository.js";
import { env } from "../../config/env.js";
import { logger } from "../../infrastructure/logging/logger.js";

export type ChatFlowErrorCode =
  | "CONVERSATION_NOT_FOUND"
  | "STT_FAILED"
  | "NO_SPEECH"
  | "AUDIO_UPLOAD_FAILED"
  | "AI_RESPONSE_FAILED"
  | "TEXT_PROCESSING_FAILED"
  | "AUDIO_PROCESSING_FAILED";

export class ChatFlowError extends Error {
  constructor(
    public readonly code: ChatFlowErrorCode,
    message: string,
    public readonly stage: "validation" | "stt" | "upload" | "ai" | "persistence" | "tts" | "unknown",
    public readonly retryable: boolean,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ChatFlowError";
  }
}

export class ChatService {
  private characterRepo = AppDataSource.getRepository(Character);
  private conversationRepo = AppDataSource.getRepository(Conversation);
  private messageRepo = AppDataSource.getRepository(Message);

  constructor(
    private gemini: GeminiService,
    private voice: ITextToSpeech & ISpeechToText,
    private vectorStore: ChromaRepository,
    private storageService: IStorageService,
    private readonly storageBucket: string = env.SUPABASE_STORAGE_BUCKET
  ) {}

  private createTraceContext(base: RequestTraceContext | undefined, extras: Record<string, unknown> = {}) {
    return {
      traceId: base?.traceId ?? `trace_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      socketId: base?.socketId,
      event: base?.event,
      ...extras,
    };
  }

  private toErrorPayload(error: unknown) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return { message: String(error) };
  }

  private async getConversation(conversationId: string, userId: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, userId },
      relations: ["character"],
    });

    if (!conversation) {
      throw new ChatFlowError(
        "CONVERSATION_NOT_FOUND",
        "Conversation not found",
        "validation",
        false
      );
    }

    return conversation;
  }

  private getEncodingFromMimeType(mimeType: string): 'WEBM_OPUS' | 'MP3' | 'LINEAR16' {
    if (mimeType.includes("webm")) {
      return "WEBM_OPUS";
    }

    if (mimeType.includes("mp3") || mimeType.includes("mpeg")) {
      return "MP3";
    }

    return "LINEAR16";
  }

  private getFileExtensionFromMimeType(mimeType: string): string {
    if (mimeType.includes("webm")) {
      return "webm";
    }

    if (mimeType.includes("mp3") || mimeType.includes("mpeg")) {
      return "mp3";
    }

    if (mimeType.includes("wav")) {
      return "wav";
    }

    return "bin";
  }

  private toChatFlowError(error: unknown, fallbackCode: ChatFlowErrorCode, fallbackMessage: string): ChatFlowError {
    if (error instanceof ChatFlowError) {
      return error;
    }

    return new ChatFlowError(fallbackCode, fallbackMessage, "unknown", true, error);
  }

  private buildTextBlocks(text: string): MessageBlock[] {
    return [{ type: "text", content: text }];
  }

  private deriveTextFromBlocks(blocks: MessageBlock[]): string {
    const textBlocks = blocks
      .filter((block): block is Extract<MessageBlock, { type: "text" }> => block.type === "text")
      .map((block) => block.content?.trim())
      .filter((value): value is string => Boolean(value));

    return textBlocks.join("\n").trim();
  }

  private isValidInfoCardProps(props: unknown): boolean {
    if (!props || typeof props !== "object" || Array.isArray(props)) {
      return false;
    }

    const value = props as Record<string, unknown>;
    if (typeof value.title !== "string" || !value.title.trim()) {
      return false;
    }

    if (value.description !== undefined && typeof value.description !== "string") {
      return false;
    }

    if (value.items === undefined) {
      return true;
    }

    if (!Array.isArray(value.items)) {
      return false;
    }

    return value.items.every((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return false;
      }

      const casted = item as Record<string, unknown>;
      return typeof casted.label === "string" && typeof casted.value === "string";
    });
  }

  private normalizeBlocks(rawBlocks: unknown): MessageBlock[] | null {
    if (!Array.isArray(rawBlocks)) {
      return null;
    }

    const normalized: MessageBlock[] = [];

    for (const rawBlock of rawBlocks) {
      if (!rawBlock || typeof rawBlock !== "object" || Array.isArray(rawBlock)) {
        continue;
      }

      const block = rawBlock as Record<string, unknown>;
      const blockType = typeof block.type === "string" ? block.type : undefined;

      if (blockType === "text") {
        if (typeof block.content !== "string" || !block.content.trim()) {
          continue;
        }

        normalized.push({
          id: typeof block.id === "string" ? block.id : undefined,
          type: "text",
          content: block.content,
        });
        continue;
      }

      if (blockType === "component") {
        const componentNameRaw =
          typeof block.componentName === "string"
            ? block.componentName
            : typeof block.component_name === "string"
              ? block.component_name
              : undefined;

        if (!componentNameRaw) {
          continue;
        }

        if (!block.props || typeof block.props !== "object" || Array.isArray(block.props)) {
          continue;
        }

        // MVP: only InfoCard is accepted for component blocks.
        if (componentNameRaw === "InfoCard" && !this.isValidInfoCardProps(block.props)) {
          continue;
        }

        normalized.push({
          id: typeof block.id === "string" ? block.id : undefined,
          type: "component",
          componentName: componentNameRaw,
          props: block.props as Record<string, unknown>,
        });
      }
    }

    return normalized.length > 0 ? normalized : null;
  }

  private normalizeAssistantOutput(rawText: string): {
    text: string;
    schemaVersion: MessageSchemaVersion;
    blocks: MessageBlock[];
  } {
    const trimmed = rawText.trim();

    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const schemaVersionRaw =
        typeof parsed.schemaVersion === "string"
          ? parsed.schemaVersion
          : typeof parsed.schema_version === "string"
            ? parsed.schema_version
            : undefined;
      const normalizedBlocks = this.normalizeBlocks(parsed.blocks);
      const fallbackContent = typeof parsed.content === "string" ? parsed.content.trim() : "";

      if (normalizedBlocks) {
        const derived = this.deriveTextFromBlocks(normalizedBlocks);
        const text = fallbackContent || derived || trimmed;
        const schemaVersion: MessageSchemaVersion =
          schemaVersionRaw === "v1_plain" || schemaVersionRaw === "v2_blocks"
            ? schemaVersionRaw
            : "v2_blocks";

        return {
          text,
          schemaVersion,
          blocks: normalizedBlocks,
        };
      }

      // If JSON is valid but blocks are malformed, keep meaningful content instead of raw JSON string.
      if (fallbackContent) {
        const schemaVersion: MessageSchemaVersion =
          schemaVersionRaw === "v1_plain" || schemaVersionRaw === "v2_blocks"
            ? schemaVersionRaw
            : "v2_blocks";

        return {
          text: fallbackContent,
          schemaVersion,
          blocks: this.buildTextBlocks(fallbackContent),
        };
      }
    } catch {
      // Non-JSON output keeps legacy behavior.
    }

    return {
      text: rawText,
      schemaVersion: "v2_blocks",
      blocks: this.buildTextBlocks(rawText),
    };
  }

  private async generateAiResponse(conversation: Conversation, userText: string) {
    const conversationId = conversation.id;

    const history = await this.messageRepo.find({
      where: { conversationId },
      order: { timestamp: "ASC" },
      take: 6,
    });

    const context = await this.vectorStore.getContext(
      userText,
      conversation.character.vectorDbName || "default"
    );

    logger.debug("[chat.generateAiResponse] context_ready", {
      conversationId,
      characterId: conversation.character.id,
      characterName: conversation.character.name,
      historyCount: history.length,
      userTextLength: userText.length,
      contextLength: context?.length ?? 0,
    });
    logger.debug("[context]", { context });

    const structuredResponse = await this.gemini.generateResponse(
      conversation.character.name,
      conversation.character.role,
      conversation.character.biography,
      history as any,
      userText,
      context
    );

    return structuredResponse;
  }

  async processTextMessage(
    conversationId: string,
    userId: string,
    userText: string,
    trace?: RequestTraceContext
  ): Promise<ChatResponse> {
    const traceCtx = this.createTraceContext(trace, {
      conversationId,
      userId,
      phase: "process_text_message",
    });

    logger.debug("[chat.processTextMessage] started", {
      ...traceCtx,
      userTextLength: userText.length,
    });

    const conversation = await this.getConversation(conversationId, userId);
    logger.debug("[chat.processTextMessage] conversation_loaded", {
      ...traceCtx,
      characterId: conversation.character.id,
      characterVoiceId: conversation.character.voiceId,
    });

    let structuredResponse: { content: string; blocks: any[] };

    try {
      structuredResponse = await this.generateAiResponse(conversation, userText);
    } catch (error) {
      throw this.toChatFlowError(error, "AI_RESPONSE_FAILED", "No se pudo generar respuesta");
    }

    logger.debug("[chat.processTextMessage] ai_response_generated", {
      ...traceCtx,
      aiResponseLength: structuredResponse.content.length,
      blocksCount: structuredResponse.blocks?.length ?? 0,
    });

    const normalizedAssistantOutput = this.normalizeAssistantOutput(
      JSON.stringify(structuredResponse)
    );

    const savedAssistantMessage = await AppDataSource.transaction(async (manager) => {
      await manager.save(Message, {
        conversationId,
        role: "user",
        content: userText,
        schemaVersion: "v1_plain",
        blocks: this.buildTextBlocks(userText),
      });

      return manager.save(Message, {
        conversationId,
        role: "assistant",
        content: normalizedAssistantOutput.text,
        schemaVersion: normalizedAssistantOutput.schemaVersion,
        blocks: normalizedAssistantOutput.blocks,
      });
    });

    logger.debug("[chat.processTextMessage] messages_saved", {
      ...traceCtx,
      assistantMessageId: savedAssistantMessage.id,
    });

    try {
      const audioBuffer = await this.voice.synthesize(normalizedAssistantOutput.text, conversation.character.voiceId);
      const assistantAudioPath = `${userId}/${conversationId}/${savedAssistantMessage.id}.mp3`;

      logger.debug("[chat.processTextMessage] tts_generated", {
        ...traceCtx,
        assistantMessageId: savedAssistantMessage.id,
        ttsVoiceId: conversation.character.voiceId,
        audioBytes: audioBuffer.length,
        assistantAudioPath,
        storageBucket: this.storageBucket,
      });

      const uploadedAssistantAudioPath = await this.storageService.uploadFile(
        this.storageBucket,
        assistantAudioPath,
        audioBuffer,
        "audio/mp3"
      );

      logger.debug("[chat.processTextMessage] assistant_audio_uploaded", {
        ...traceCtx,
        assistantMessageId: savedAssistantMessage.id,
        uploadedAssistantAudioPath,
      });

      await this.messageRepo.update(
        { id: savedAssistantMessage.id },
        {
          audioPath: uploadedAssistantAudioPath,
          audioStorageId: uploadedAssistantAudioPath,
          mediaType: "audio/mp3",
        }
      );

      return {
        messageId: savedAssistantMessage.id,
        text: normalizedAssistantOutput.text,
        audioBase64: audioBuffer.toString("base64"),
        schemaVersion: normalizedAssistantOutput.schemaVersion,
        blocks: normalizedAssistantOutput.blocks,
      };
    } catch (error) {
      logger.error("[chat.processTextMessage] tts_or_upload_failed", {
        ...traceCtx,
        assistantMessageId: savedAssistantMessage.id,
        ttsVoiceId: conversation.character.voiceId,
        error: this.toErrorPayload(error),
      });

      return {
        messageId: savedAssistantMessage.id,
        text: normalizedAssistantOutput.text,
        schemaVersion: normalizedAssistantOutput.schemaVersion,
        blocks: normalizedAssistantOutput.blocks,
        warning: {
          code: "TTS_FAILED",
          message: "La respuesta se generó, pero el audio no está disponible.",
          stage: "tts",
          retryable: true,
        },
      };
    }
  }

  async processAudioMessage(input: ProcessAudioMessageInput): Promise<{ transcription: string } & ChatResponse> {
    const traceCtx = this.createTraceContext(input.trace, {
      conversationId: input.conversationId,
      userId: input.userId,
      phase: "process_audio_message",
    });

    logger.debug("[chat.processAudioMessage] started", {
      ...traceCtx,
      mimeType: input.mimeType,
      audioBytes: input.audioBuffer.length,
    });

    const conversation = await this.getConversation(input.conversationId, input.userId);

    logger.debug("[chat.processAudioMessage] conversation_loaded", {
      ...traceCtx,
      characterId: conversation.character.id,
      characterVoiceId: conversation.character.voiceId,
    });

    const userAudioExtension = this.getFileExtensionFromMimeType(input.mimeType);
    const audioReference = `audio_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const userAudioPath = `${input.userId}/${input.conversationId}/${audioReference}.${userAudioExtension}`;
    const encoding = this.getEncodingFromMimeType(input.mimeType);

    logger.debug("[chat.processAudioMessage] user_audio_prepared", {
      ...traceCtx,
      userAudioExtension,
      userAudioPath,
      encoding,
    });

    const [uploadResult, sttResult] = await Promise.allSettled([
      this.storageService.uploadFile(this.storageBucket, userAudioPath, input.audioBuffer, input.mimeType),
      this.voice.transcribe(input.audioBuffer, encoding),
    ]);

    logger.debug("[chat.processAudioMessage] upload_stt_completed", {
      ...traceCtx,
      uploadStatus: uploadResult.status,
      sttStatus: sttResult.status,
      uploadError: uploadResult.status === "rejected" ? this.toErrorPayload(uploadResult.reason) : undefined,
      sttError: sttResult.status === "rejected" ? this.toErrorPayload(sttResult.reason) : undefined,
    });

    if (sttResult.status === "rejected") {
      logger.error("[chat.processAudioMessage] stt_failed", {
        ...traceCtx,
        error: this.toErrorPayload(sttResult.reason),
      });
      throw new ChatFlowError(
        "STT_FAILED",
        "No se pudo transcribir el audio",
        "stt",
        true,
        sttResult.reason
      );
    }

    const transcription = sttResult.value.trim();
    if (!transcription) {
      logger.warn("[chat.processAudioMessage] no_speech_detected", {
        ...traceCtx,
      });
      throw new ChatFlowError(
        "NO_SPEECH",
        "No se detectó habla en el audio. Inténtalo de nuevo.",
        "stt",
        true
      );
    }

    logger.debug("[chat.processAudioMessage] transcription_ready", {
      ...traceCtx,
      transcriptionLength: transcription.length,
    });

    if (uploadResult.status === "rejected") {
      logger.error("[chat.processAudioMessage] audio_upload_failed", {
        ...traceCtx,
        error: this.toErrorPayload(uploadResult.reason),
      });
      throw new ChatFlowError(
        "AUDIO_UPLOAD_FAILED",
        "No se pudo subir el audio",
        "upload",
        true,
        uploadResult.reason
      );
    }

    const uploadedUserAudioPath = uploadResult.value;

    let structuredResponse: { content: string; blocks: any[] };

    try {
      structuredResponse = await this.generateAiResponse(conversation, transcription);
    } catch (error) {
      throw this.toChatFlowError(error, "AI_RESPONSE_FAILED", "No se pudo generar respuesta");
    }

    const normalizedAssistantOutput = this.normalizeAssistantOutput(
      JSON.stringify(structuredResponse)
    );

    const { savedAssistantMessage } = await AppDataSource.transaction(async (manager) => {
      await manager.save(Message, {
        conversationId: input.conversationId,
        role: "user",
        content: transcription,
        schemaVersion: "v1_plain",
        blocks: this.buildTextBlocks(transcription),
        mediaType: input.mimeType,
        audioPath: uploadedUserAudioPath,
        audioStorageId: uploadedUserAudioPath,
      });

      const assistantMessage = await manager.save(Message, {
        conversationId: input.conversationId,
        role: "assistant",
        content: normalizedAssistantOutput.text,
        schemaVersion: normalizedAssistantOutput.schemaVersion,
        blocks: normalizedAssistantOutput.blocks,
      });

      return { savedAssistantMessage: assistantMessage };
    });

    logger.debug("[chat.processAudioMessage] assistant_message_saved", {
      ...traceCtx,
      assistantMessageId: savedAssistantMessage.id,
      aiResponseLength: normalizedAssistantOutput.text.length,
    });

    try {
      const assistantAudioBuffer = await this.voice.synthesize(
        normalizedAssistantOutput.text,
        conversation.character.voiceId
      );
      const assistantAudioPath = `${input.userId}/${input.conversationId}/${savedAssistantMessage.id}.mp3`;

      logger.debug("[chat.processAudioMessage] assistant_tts_generated", {
        ...traceCtx,
        assistantMessageId: savedAssistantMessage.id,
        ttsVoiceId: conversation.character.voiceId,
        audioBytes: assistantAudioBuffer.length,
        assistantAudioPath,
        storageBucket: this.storageBucket,
      });

      const uploadedAssistantAudioPath = await this.storageService.uploadFile(
        this.storageBucket,
        assistantAudioPath,
        assistantAudioBuffer,
        "audio/mp3"
      );

      logger.debug("[chat.processAudioMessage] assistant_audio_uploaded", {
        ...traceCtx,
        assistantMessageId: savedAssistantMessage.id,
        uploadedAssistantAudioPath,
      });

      await this.messageRepo.update(
        { id: savedAssistantMessage.id },
        {
          audioPath: uploadedAssistantAudioPath,
          audioStorageId: uploadedAssistantAudioPath,
          mediaType: "audio/mp3",
        }
      );

      return {
        transcription,
        messageId: savedAssistantMessage.id,
        text: normalizedAssistantOutput.text,
        audioBase64: assistantAudioBuffer.toString("base64"),
        schemaVersion: normalizedAssistantOutput.schemaVersion,
        blocks: normalizedAssistantOutput.blocks,
      };
    } catch (error) {
      logger.error("[chat.processAudioMessage] assistant_tts_or_upload_failed", {
        ...traceCtx,
        assistantMessageId: savedAssistantMessage.id,
        ttsVoiceId: conversation.character.voiceId,
        error: this.toErrorPayload(error),
      });

      return {
        transcription,
        messageId: savedAssistantMessage.id,
        text: normalizedAssistantOutput.text,
        schemaVersion: normalizedAssistantOutput.schemaVersion,
        blocks: normalizedAssistantOutput.blocks,
        warning: {
          code: "TTS_FAILED",
          message: "La respuesta se generó, pero el audio no está disponible.",
          stage: "tts",
          retryable: true,
        },
      };
    }
  }
}