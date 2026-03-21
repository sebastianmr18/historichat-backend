import { AppDataSource } from "../../config/database.js";
import { Conversation } from "../../infrastructure/database/entities/Conversation.js";
import { Message } from "../../infrastructure/database/entities/Message.js";
import { GeminiService } from "../../infrastructure/ai/gemini.service.js";
import { ChatResponse, IStorageService, ITextToSpeech, ISpeechToText, ProcessAudioMessageInput, RequestTraceContext } from "../../shared/types.js";
import { ChromaRepository } from "../../infrastructure/vector/chroma.repository.js";
import { env } from "../../config/env.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { serializeError } from "../../shared/errors.js";
import { createTraceContext } from "../../shared/trace.js";
import { getEncodingFromMimeType, getFileExtensionFromMimeType } from "../../shared/mime-utils.js";
import { buildSystemPrompt } from "../prompts/character-prompt.js";
import type { ChatFlowErrorCode } from "../../domain/errors/chat-flow.error.js";
import { ChatFlowError } from "../../domain/errors/chat-flow.error.js";
export { ChatFlowError, ChatFlowErrorCode };

export class ChatService {
  private conversationRepo = AppDataSource.getRepository(Conversation);
  private messageRepo = AppDataSource.getRepository(Message);

  constructor(
    private gemini: GeminiService,
    private voice: ITextToSpeech & ISpeechToText,
    private vectorStore: ChromaRepository,
    private storageService: IStorageService,
    private readonly storageBucket: string = env.SUPABASE_STORAGE_BUCKET
  ) {}

  private toChatFlowError(error: unknown, fallbackCode: ChatFlowErrorCode, fallbackMessage: string): ChatFlowError {
    if (error instanceof ChatFlowError) {
      return error;
    }

    return new ChatFlowError(fallbackCode, fallbackMessage, "unknown", true, error);
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

  private async synthesizeAndUpload(
    text: string,
    voiceId: string | undefined,
    messageId: number,
    userId: string,
    conversationId: string,
    traceCtx: Record<string, unknown>
  ): Promise<{ audioBase64: string } | { warning: ChatResponse["warning"] }> {
    try {
      const audioBuffer = await this.voice.synthesize(text, voiceId);
      const audioPath = `${userId}/${conversationId}/${messageId}.mp3`;

      logger.debug("[chat.synthesizeAndUpload] tts_generated", {
        ...traceCtx,
        messageId,
        voiceId,
        audioBytes: audioBuffer.length,
        audioPath,
        storageBucket: this.storageBucket,
      });

      const uploadedPath = await this.storageService.uploadFile(
        this.storageBucket,
        audioPath,
        audioBuffer,
        "audio/mp3"
      );

      logger.debug("[chat.synthesizeAndUpload] audio_uploaded", {
        ...traceCtx,
        messageId,
        uploadedPath,
      });

      await this.messageRepo.update(
        { id: messageId },
        {
          audioPath: uploadedPath,
          audioStorageId: uploadedPath,
          mediaType: "audio/mp3",
        }
      );

      return { audioBase64: audioBuffer.toString("base64") };
    } catch (error) {
      logger.error("[chat.synthesizeAndUpload] tts_or_upload_failed", {
        ...traceCtx,
        messageId,
        voiceId,
        error: serializeError(error),
      });

      return {
        warning: {
          code: "TTS_FAILED",
          message: "La respuesta se generó, pero el audio no está disponible.",
          stage: "tts",
          retryable: true,
        },
      };
    }
  }

  private async generateAiResponse(conversation: Conversation, userText: string) {
    const conversationId = conversation.id;

    const history = await this.messageRepo.find({
      where: { conversationId },
      order: { timestamp: "ASC", id: "ASC" },
      take: 6,
    });

    const context = await this.vectorStore.getContext(
      userText,
      conversation.character.vectorDbName || "default"
    );

    const systemPrompt = buildSystemPrompt(conversation.character);

    logger.debug("[chat.generateAiResponse] context_ready", {
      conversationId,
      characterId: conversation.character.id,
      characterName: conversation.character.name,
      historyCount: history.length,
      userTextLength: userText.length,
      contextLength: context?.length ?? 0,
      systemPromptLength: systemPrompt.length,
    });
    logger.debug("[systemPrompt]", { systemPrompt });
    logger.debug("[context]", { context });

    const aiResponseText = await this.gemini.generateResponse(
      systemPrompt,
      history as any,
      userText,
      context
    );

    return aiResponseText;
  }

  async processTextMessage(
    conversationId: string,
    userId: string,
    userText: string,
    trace?: RequestTraceContext
  ): Promise<ChatResponse> {
    const traceCtx = createTraceContext(trace, {
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

    let aiResponseText: string;

    try {
      aiResponseText = await this.generateAiResponse(conversation, userText);
    } catch (error) {
      throw this.toChatFlowError(error, "AI_RESPONSE_FAILED", "No se pudo generar respuesta");
    }

    logger.debug("[chat.processTextMessage] ai_response_generated", {
      ...traceCtx,
      aiResponseLength: aiResponseText.length,
    });

    const savedAssistantMessage = await AppDataSource.transaction(async (manager) => {
      await manager.save(Message, { conversationId, role: "user", content: userText });
      return manager.save(Message, { conversationId, role: "assistant", content: aiResponseText });
    });

    logger.debug("[chat.processTextMessage] messages_saved", {
      ...traceCtx,
      assistantMessageId: savedAssistantMessage.id,
    });

    const audioResult = await this.synthesizeAndUpload(
      aiResponseText,
      conversation.character.voiceId,
      savedAssistantMessage.id,
      userId,
      conversationId,
      traceCtx
    );

    return { text: aiResponseText, ...audioResult };
  }

  async processAudioMessage(input: ProcessAudioMessageInput): Promise<{ transcription: string } & ChatResponse> {
    const traceCtx = createTraceContext(input.trace, {
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

    const userAudioExtension = getFileExtensionFromMimeType(input.mimeType);
    const audioReference = `audio_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const userAudioPath = `${input.userId}/${input.conversationId}/${audioReference}.${userAudioExtension}`;
    const encoding = getEncodingFromMimeType(input.mimeType);

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
      uploadError: uploadResult.status === "rejected" ? serializeError(uploadResult.reason) : undefined,
      sttError: sttResult.status === "rejected" ? serializeError(sttResult.reason) : undefined,
    });

    if (sttResult.status === "rejected") {
      logger.error("[chat.processAudioMessage] stt_failed", {
        ...traceCtx,
        error: serializeError(sttResult.reason),
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
      logger.warn("[chat.processAudioMessage] no_speech_detected", { ...traceCtx });
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
        error: serializeError(uploadResult.reason),
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

    let aiResponseText: string;

    try {
      aiResponseText = await this.generateAiResponse(conversation, transcription);
    } catch (error) {
      throw this.toChatFlowError(error, "AI_RESPONSE_FAILED", "No se pudo generar respuesta");
    }

    const { savedAssistantMessage } = await AppDataSource.transaction(async (manager) => {
      await manager.save(Message, {
        conversationId: input.conversationId,
        role: "user",
        content: transcription,
        mediaType: input.mimeType,
        audioPath: uploadedUserAudioPath,
        audioStorageId: uploadedUserAudioPath,
      });

      const assistantMessage = await manager.save(Message, {
        conversationId: input.conversationId,
        role: "assistant",
        content: aiResponseText,
      });

      return { savedAssistantMessage: assistantMessage };
    });

    logger.debug("[chat.processAudioMessage] assistant_message_saved", {
      ...traceCtx,
      assistantMessageId: savedAssistantMessage.id,
      aiResponseLength: aiResponseText.length,
    });

    const audioResult = await this.synthesizeAndUpload(
      aiResponseText,
      conversation.character.voiceId,
      savedAssistantMessage.id,
      input.userId,
      input.conversationId,
      traceCtx
    );

    return { transcription, text: aiResponseText, ...audioResult };
  }
}
