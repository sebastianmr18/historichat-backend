import { Character } from "../../infrastructure/database/entities/Character.js";
import { Conversation } from "../../infrastructure/database/entities/Conversation.js";
import { Message } from "../../infrastructure/database/entities/Message.js";
import { GeminiService } from "../../infrastructure/ai/gemini.service.js";
import {
  ChatResponse,
  ConversationMode,
  DebateProgressCallbacks,
  DebateTurnCharacterResult,
  DebateTurnResult,
  DebateWarningPayload,
  IStorageService,
  ITextToSpeech,
  ISpeechToText,
  ProcessAudioMessageInput,
  RequestTraceContext,
} from "../../shared/types.js";
import { ChromaRepository } from "../../infrastructure/vector/chroma.repository.js";
import { env } from "../../config/env.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { serializeError } from "../../shared/errors.js";
import { createTraceContext } from "../../shared/trace.js";
import { getEncodingFromMimeType, getFileExtensionFromMimeType } from "../../shared/mime-utils.js";
import { suggestionsSchema } from "../prompts/suggestions-prompt.js";
import { PromptDebateContext } from "../prompts/prompt.types.js";
import { buildModeSystemPrompt } from "../prompts/system-prompt-builder.js";
import { buildModeSuggestionsPrompt } from "../prompts/suggestions-prompt-builder.js";
import type { ChatFlowErrorCode } from "../../domain/errors/chat-flow.error.js";
import { ChatFlowError } from "../../domain/errors/chat-flow.error.js";
import type { IRepository, IDataSource } from "../../domain/repositories/repository.interfaces.js";

export class ChatService {
  constructor(
    private gemini: GeminiService,
    private voice: ITextToSpeech & ISpeechToText,
    private vectorStore: ChromaRepository,
    private storageService: IStorageService,
    private conversationRepo: IRepository<Conversation>,
    private messageRepo: IRepository<Message>,
    private dataSource: IDataSource,
    private readonly storageBucket: string = env.SUPABASE_STORAGE_BUCKET
  ) {}

  private toChatFlowError(error: unknown, fallbackCode: ChatFlowErrorCode, fallbackMessage: string): ChatFlowError {
    if (error instanceof ChatFlowError) {
      return error;
    }

    return new ChatFlowError(fallbackCode, fallbackMessage, "unknown", true, error);
  }

  private async cleanupDebateMessages(
    messageIds: number[],
    traceCtx: Record<string, unknown>
  ): Promise<void> {
    if (messageIds.length === 0) return;

    try {
      await this.messageRepo.delete(messageIds);
      logger.debug("[chat.processDebateMessage] debate_cleanup_completed", {
        ...traceCtx,
        deletedMessageIds: messageIds,
      });
    } catch (cleanupError) {
      logger.error("[chat.processDebateMessage] debate_cleanup_failed", {
        ...traceCtx,
        deletedMessageIds: messageIds,
        error: serializeError(cleanupError),
      });
    }
  }

  private async getConversation(conversationId: string, userId: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, userId },
      relations: {
        character: true,
        secondaryCharacter: true,
      },
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

  private async loadConversationHistory(conversationId: string, take = 6) {
    return this.messageRepo.find({
      where: { conversationId },
      order: { timestamp: "ASC", id: "ASC" },
      take,
    });
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

  private async generateAiResponse(params: {
    conversationId: string;
    character: Character;
    userText: string;
    mode: "interview" | "call" | "debate";
    history?: Array<Pick<Message, "role" | "content">>;
    characterName?: string;
    debate?: PromptDebateContext;
    generateSuggestions?: boolean;
  }): Promise<{ text: string; suggestions?: string[] }> {
    const history = params.history ?? (await this.loadConversationHistory(params.conversationId));

    const context = await this.vectorStore.getContext(
      params.userText,
      params.character.vectorDbName || "default"
    );

    const systemPrompt = buildModeSystemPrompt({
      character: params.character,
      mode: params.mode,
      debate: params.debate,
      isRealtime: params.mode === "call",
    });

    logger.debug("[chat.generateAiResponse] context_ready", {
      conversationId: params.conversationId,
      characterId: params.character.id,
      characterName: params.character.name,
      mode: params.mode,
      historyCount: history.length,
      userTextLength: params.userText.length,
      contextLength: context?.length ?? 0,
      systemPromptLength: systemPrompt.length,
    });
    logger.debug("[systemPrompt]", { systemPrompt });
    logger.debug("[context]", { context });

    // Generate main AI response
    const aiResponse = await this.gemini.generateResponse(
      systemPrompt,
      history as any,
      params.userText,
      context
    );

    const aiResponseText = aiResponse.text;

    // Generate suggestions in parallel (graceful degradation if it fails)
    let suggestions: string[] | undefined;
    if (params.generateSuggestions !== false) {
      try {
        const suggestionsPrompt = buildModeSuggestionsPrompt({
          mode: params.mode,
          lastMessages: history,
          characterName: params.characterName ?? params.character.name,
          debate: params.debate,
        });
        const suggestionsResponse = await this.gemini.generateResponse(
          "You are a helpful assistant that generates follow-up suggestions.",
          [],
          suggestionsPrompt,
          undefined,
          suggestionsSchema
        );

        if (suggestionsResponse.structuredOutput) {
          const parsed = suggestionsResponse.structuredOutput as { suggestions?: string[] };
          suggestions = parsed.suggestions?.filter(s => typeof s === 'string' && s.length > 0);
        }
      } catch (error) {
        logger.warn("[chat.generateAiResponse] suggestions generation failed, proceeding without", {
          conversationId: params.conversationId,
          error: serializeError(error),
        });
      }
    }

    return {
      text: aiResponseText,
      suggestions,
    };
  }

  async processTextMessage(
    conversationId: string,
    userId: string,
    userText: string,
    mode?: ConversationMode,
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
      mode: mode ?? 'interview',
    });

    const conversation = await this.getConversation(conversationId, userId);

    logger.debug("[chat.processTextMessage] conversation_loaded", {
      ...traceCtx,
      characterId: conversation.character.id,
      characterVoiceId: conversation.character.voiceId,
    });

    let aiResponseText: string;
    let suggestions: string[] | undefined;

    try {
      const aiResponse = await this.generateAiResponse({
        conversationId,
        character: conversation.character,
        userText,
        mode: mode ?? "interview",
      });
      aiResponseText = aiResponse.text;
      suggestions = aiResponse.suggestions;
    } catch (error) {
      throw this.toChatFlowError(error, "AI_RESPONSE_FAILED", "No se pudo generar respuesta");
    }

    logger.debug("[chat.processTextMessage] ai_response_generated", {
      ...traceCtx,
      aiResponseLength: aiResponseText.length,
      hasSuggestions: Boolean(suggestions && suggestions.length > 0),
    });

    const savedAssistantMessage = await this.dataSource.transaction(async (manager) => {
      await manager.save(Message, { conversationId, role: "user", content: userText });
      return manager.save(Message, {
        conversationId,
        role: "assistant",
        content: aiResponseText,
        speakerCharacterId: conversation.character.id,
      });
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

    return {
      text: aiResponseText,
      messageId: savedAssistantMessage.id,
      speakerId: conversation.character.id,
      speakerName: conversation.character.name,
      suggestions,
      ...audioResult,
    };
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
    let suggestions: string[] | undefined;

    try {
      const aiResponse = await this.generateAiResponse({
        conversationId: input.conversationId,
        character: conversation.character,
        userText: transcription,
        mode: input.mode ?? "interview",
      });
      aiResponseText = aiResponse.text;
      suggestions = aiResponse.suggestions;
    } catch (error) {
      throw this.toChatFlowError(error, "AI_RESPONSE_FAILED", "No se pudo generar respuesta");
    }

    const { savedAssistantMessage } = await this.dataSource.transaction(async (manager) => {
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
        speakerCharacterId: conversation.character.id,
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

    return {
      transcription,
      text: aiResponseText,
      messageId: savedAssistantMessage.id,
      speakerId: conversation.character.id,
      speakerName: conversation.character.name,
      suggestions,
      ...audioResult,
    };
  }

  async processDebateMessage(
    conversationId: string,
    userId: string,
    userText: string,
    trace?: RequestTraceContext,
    callbacks?: DebateProgressCallbacks
  ): Promise<DebateTurnResult> {
    const traceCtx = createTraceContext(trace, {
      conversationId,
      userId,
      phase: "process_debate_message",
    });

    logger.debug("[chat.processDebateMessage] started", {
      ...traceCtx,
      userTextLength: userText.length,
    });

    // 1. Validate conversation and debate config
    const conversation = await this.getConversation(conversationId, userId);

    if (!conversation.secondaryCharacterId || !conversation.secondaryCharacter) {
      throw new ChatFlowError(
        "DEBATE_NOT_AVAILABLE",
        "La conversación no está configurada en modo debate",
        "validation",
        false
      );
    }

    const speakerA = conversation.character;
    const speakerB = conversation.secondaryCharacter;
    const baseHistory = await this.loadConversationHistory(conversationId);

    // Track persisted message IDs for compensating cleanup on failure
    const persistedMessageIds: number[] = [];

    // 2. Persist user message early
    const userMessage = await this.dataSource.transaction(async (manager) => {
      return manager.save(Message, {
        conversationId,
        role: "user",
        content: userText,
      });
    });
    persistedMessageIds.push(userMessage.id);

    logger.debug("[chat.processDebateMessage] debate_user_persisted", {
      ...traceCtx,
      userMessageId: userMessage.id,
    });

    callbacks?.onUserMessagePersisted({
      userMessageId: userMessage.id,
      userText,
    });

    // 3. Generate & persist Speaker A
    callbacks?.onTyping({
      speakerId: speakerA.id,
      speakerName: speakerA.name,
      turnOrder: "A",
    });

    logger.debug("[chat.processDebateMessage] debate_typing_emitted", {
      ...traceCtx,
      speakerId: speakerA.id,
      phase: "typing_A",
    });

    let responseA: string;
    try {
      const aiResponseA = await this.generateAiResponse({
        conversationId,
        character: speakerA,
        userText,
        mode: "debate",
        history: baseHistory,
        debate: {
          currentSpeaker: { id: speakerA.id, name: speakerA.name, role: speakerA.role },
          opponent: { id: speakerB.id, name: speakerB.name, role: speakerB.role },
          turnOrder: "A",
        },
        generateSuggestions: false,
      });
      responseA = aiResponseA.text;
    } catch (error) {
      await this.cleanupDebateMessages(persistedMessageIds, traceCtx);
      throw this.toChatFlowError(error, "AI_RESPONSE_FAILED", "No se pudo generar respuesta del personaje A");
    }

    logger.debug("[chat.processDebateMessage] debate_speaker_a_generated", {
      ...traceCtx,
      speakerId: speakerA.id,
      responseLength: responseA.length,
    });

    let speakerAMessage: Message;
    try {
      speakerAMessage = await this.dataSource.transaction(async (manager) => {
        return manager.save(Message, {
          conversationId,
          role: "assistant",
          content: responseA,
          speakerCharacterId: speakerA.id,
        });
      });
      persistedMessageIds.push(speakerAMessage.id);
    } catch (error) {
      await this.cleanupDebateMessages(persistedMessageIds, traceCtx);
      throw this.toChatFlowError(error, "AI_RESPONSE_FAILED", "No se pudo persistir respuesta del personaje A");
    }

    // TTS for A
    const turnResultA: DebateTurnCharacterResult = {
      messageId: speakerAMessage.id,
      text: responseA,
      speakerId: speakerA.id,
      speakerName: speakerA.name,
    };

    if (env.DEBATE_TTS_ENABLED) {
      const audioA = await this.synthesizeAndUpload(
        responseA,
        speakerA.voiceId,
        speakerAMessage.id,
        userId,
        conversationId,
        { ...traceCtx, speaker: "A", speakerId: speakerA.id }
      );
      if ("audioBase64" in audioA) {
        turnResultA.audioBase64 = audioA.audioBase64;
      } else {
        turnResultA.warning = audioA.warning;
      }
    }

    logger.debug("[chat.processDebateMessage] debate_speaker_a_emitted", {
      ...traceCtx,
      messageId: speakerAMessage.id,
      speakerId: speakerA.id,
    });

    callbacks?.onTurnReady({ ...turnResultA, turnOrder: "A" });

    // 4. Generate & persist Speaker B
    callbacks?.onTyping({
      speakerId: speakerB.id,
      speakerName: speakerB.name,
      turnOrder: "B",
    });

    logger.debug("[chat.processDebateMessage] debate_typing_emitted", {
      ...traceCtx,
      speakerId: speakerB.id,
      phase: "typing_B",
    });

    const historyForSpeakerB: Array<Pick<Message, "role" | "content">> = [
      ...baseHistory,
      { role: "assistant", content: responseA },
    ];

    let responseB: string;
    try {
      const aiResponseB = await this.generateAiResponse({
        conversationId,
        character: speakerB,
        userText,
        mode: "debate",
        history: historyForSpeakerB,
        debate: {
          currentSpeaker: { id: speakerB.id, name: speakerB.name, role: speakerB.role },
          opponent: { id: speakerA.id, name: speakerA.name, role: speakerA.role },
          turnOrder: "B",
        },
        generateSuggestions: false,
      });
      responseB = aiResponseB.text;
    } catch (error) {
      await this.cleanupDebateMessages(persistedMessageIds, traceCtx);
      throw this.toChatFlowError(error, "AI_RESPONSE_FAILED", "No se pudo generar respuesta del personaje B");
    }

    logger.debug("[chat.processDebateMessage] debate_speaker_b_generated", {
      ...traceCtx,
      speakerId: speakerB.id,
      responseLength: responseB.length,
    });

    let speakerBMessage: Message;
    try {
      speakerBMessage = await this.dataSource.transaction(async (manager) => {
        return manager.save(Message, {
          conversationId,
          role: "assistant",
          content: responseB,
          speakerCharacterId: speakerB.id,
        });
      });
    } catch (error) {
      await this.cleanupDebateMessages(persistedMessageIds, traceCtx);
      throw this.toChatFlowError(error, "AI_RESPONSE_FAILED", "No se pudo persistir respuesta del personaje B");
    }

    // TTS for B
    const turnResultB: DebateTurnCharacterResult = {
      messageId: speakerBMessage.id,
      text: responseB,
      speakerId: speakerB.id,
      speakerName: speakerB.name,
    };

    if (env.DEBATE_TTS_ENABLED) {
      const audioB = await this.synthesizeAndUpload(
        responseB,
        speakerB.voiceId,
        speakerBMessage.id,
        userId,
        conversationId,
        { ...traceCtx, speaker: "B", speakerId: speakerB.id }
      );
      if ("audioBase64" in audioB) {
        turnResultB.audioBase64 = audioB.audioBase64;
      } else {
        turnResultB.warning = audioB.warning;
      }
    }

    logger.debug("[chat.processDebateMessage] debate_speaker_b_emitted", {
      ...traceCtx,
      messageId: speakerBMessage.id,
      speakerId: speakerB.id,
    });

    callbacks?.onTurnReady({ ...turnResultB, turnOrder: "B" });

    // 5. Round complete
    const responses = [turnResultA, turnResultB];
    const warnings: DebateWarningPayload[] = responses
      .map((r) => r.warning)
      .filter((w): w is DebateWarningPayload => w != null);

    callbacks?.onRoundCompleted({
      warnings: warnings.length > 0 ? warnings : undefined,
    });

    logger.debug("[chat.processDebateMessage] debate_round_completed", {
      ...traceCtx,
      userMessageId: userMessage.id,
      responseCount: responses.length,
      speakerAId: speakerA.id,
      speakerBId: speakerB.id,
    });

    return {
      userMessageId: userMessage.id,
      userText,
      responses,
    };
  }
}
