import { Character } from "../../infrastructure/database/entities/Character.js";
import { Conversation } from "../../infrastructure/database/entities/Conversation.js";
import { Message } from "../../infrastructure/database/entities/Message.js";
import type { LlmProvider } from "../../infrastructure/ai/llm-provider.interface.js";
import {
  ChatResponse,
  ConversationMode,
  DebateSpeakerInferenceDetails,
  DebateSkipReason,
  DebateProgressCallbacks,
  DebateTurnCharacterResult,
  DebateTurnOrder,
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
import { debateTurnSchema } from "../prompts/debate-turn.schema.js";
import type { ChatFlowErrorCode } from "../../domain/errors/chat-flow.error.js";
import { ChatFlowError } from "../../domain/errors/chat-flow.error.js";
import type { IRepository, IDataSource } from "../../domain/repositories/repository.interfaces.js";
import { sanitizeAssistantOutput } from "../../shared/llm-output-sanitizer.js";
import { sanitizePromptField } from "../prompts/prompt-field-sanitizer.js";
import { detectDebateMentionedSpeaker } from "./speaker-mention-detector.js";

const MAX_USER_MESSAGE_LENGTH = 8000;

interface DebateDecisionOutput {
  action: "respond" | "skip";
  text?: string;
  reason?: string;
  confidence: number;
  skipReason?: DebateSkipReason;
}

type DebateDecisionSource = "native_object" | "text_json" | "text_fenced_json" | "text_embedded_json";

interface DebateDecisionParseResult {
  decision: DebateDecisionOutput | null;
  source: DebateDecisionSource | null;
}

interface DebateProcessOptions {
  forcedSpeakerId?: string | null;
  manualSkips?: Record<string, string | undefined>;
  userAudio?: {
    audioPath: string;
    mimeType: string;
  };
}

interface DebateSpeakerPlan {
  speaker: Character;
  opponent: Character;
  turnOrder: DebateTurnOrder;
  isForced: boolean;
}

export class ChatService {
  constructor(
    private llm: LlmProvider,
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

  private assertValidUserInput(userText: string, context: string): void {
    const trimmed = (userText ?? "").trim();

    if (!trimmed) {
      throw new ChatFlowError("INVALID_INPUT", "El mensaje no puede estar vacío.", "validation", false);
    }

    if (trimmed.length > MAX_USER_MESSAGE_LENGTH) {
      throw new ChatFlowError(
        "INVALID_INPUT",
        `El mensaje supera el límite de ${MAX_USER_MESSAGE_LENGTH} caracteres.`,
        "validation",
        false,
      );
    }

    // Detect injection patterns for monitoring only — the structural defense lives in buildFinalUserPrompt.
    const { hadSuspiciousContent } = sanitizePromptField(trimmed, "userMessage");
    if (hadSuspiciousContent) {
      logger.warn("[security] suspicious_user_input_detected", {
        context,
        preview: trimmed.slice(0, 100),
      });
    }
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
    const messages = await this.messageRepo.find({
      where: { conversationId },
      order: { timestamp: "ASC", id: "ASC" },
      take,
    });
    return messages.filter((m) => m.role === "user" || m.role === "assistant");
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
    const aiResponse = await this.llm.generateResponse(
      systemPrompt,
      history as any,
      params.userText,
      context
    );

    const aiResponseText = sanitizeAssistantOutput(aiResponse.text, {
      allowJsonEnvelope: true,
      rejectCodeLikeContent: true,
    });

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
        const suggestionsResponse = await this.llm.generateResponse(
          "You are a helpful assistant that generates follow-up suggestions.",
          [],
          suggestionsPrompt,
          undefined,
          suggestionsSchema
        );

        if (suggestionsResponse.structuredOutput) {
          const parsed = suggestionsResponse.structuredOutput as { suggestions?: string[] };
          suggestions = parsed.suggestions
            ?.filter((s) => typeof s === "string" && s.length > 0)
            .map((s) => sanitizeAssistantOutput(s, {
              allowJsonEnvelope: false,
              rejectCodeLikeContent: true,
            }))
            .slice(0, 3);
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

  private normalizeDebateDecision(raw: unknown): DebateDecisionOutput | null {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const payload = raw as Record<string, unknown>;
    const action = payload.action === "skip" ? "skip" : payload.action === "respond" ? "respond" : null;
    if (!action) {
      return null;
    }

    const confidenceRaw = payload.confidence;
    const confidence = typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw)
      ? Math.max(0, Math.min(1, confidenceRaw))
      : 0.5;

    const text = typeof payload.text === "string" ? payload.text.trim() : undefined;
    const reason = typeof payload.reason === "string" ? payload.reason.trim() : undefined;
    const skipReasonRaw = typeof payload.skipReason === "string" ? payload.skipReason : undefined;
    const skipReason: DebateSkipReason | undefined =
      skipReasonRaw === "manual_user" ||
      skipReasonRaw === "auto_low_confidence" ||
      skipReasonRaw === "not_applicable" ||
      skipReasonRaw === "strategy" ||
      skipReasonRaw === "unknown"
        ? skipReasonRaw
        : undefined;

    if (action === "respond" && !text) {
      return null;
    }

    return {
      action,
      text,
      reason,
      confidence,
      skipReason,
    };
  }

  private tryParseJsonObject(text: string): Record<string, unknown> | null {
    const trimmed = text.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private extractSingleJsonFence(text: string): string | null {
    const match = text.trim().match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
    return match?.[1]?.trim() ?? null;
  }

  private extractEmbeddedJsonObject(text: string): string | null {
    const content = text.trim();
    const start = content.indexOf("{");
    if (start === -1) {
      return null;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < content.length; i += 1) {
      const char = content[i];
      if (char == null) {
        continue;
      }

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === "\\") {
          escaped = true;
          continue;
        }

        if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return content.slice(start, i + 1);
        }
      }
    }

    return null;
  }

  private parseDebateDecision(raw: unknown): DebateDecisionParseResult {
    if (raw && typeof raw === "object") {
      return {
        decision: this.normalizeDebateDecision(raw),
        source: "native_object",
      };
    }

    if (typeof raw !== "string") {
      return { decision: null, source: null };
    }

    const fromJsonText = this.tryParseJsonObject(raw);
    if (fromJsonText) {
      return {
        decision: this.normalizeDebateDecision(fromJsonText),
        source: "text_json",
      };
    }

    const fenced = this.extractSingleJsonFence(raw);
    if (fenced) {
      const fromFence = this.tryParseJsonObject(fenced);
      if (fromFence) {
        return {
          decision: this.normalizeDebateDecision(fromFence),
          source: "text_fenced_json",
        };
      }
    }

    const embedded = this.extractEmbeddedJsonObject(raw);
    if (embedded) {
      const fromEmbedded = this.tryParseJsonObject(embedded);
      if (fromEmbedded) {
        return {
          decision: this.normalizeDebateDecision(fromEmbedded),
          source: "text_embedded_json",
        };
      }
    }

    return { decision: null, source: null };
  }

  private resolveDebatePlans(
    speakerA: Character,
    speakerB: Character,
    nextSpeakerId?: string | null,
    forcedSpeakerId?: string | null
  ): DebateSpeakerPlan[] {
    if (!forcedSpeakerId) {
      if (nextSpeakerId === speakerB.id) {
        return [
          { speaker: speakerB, opponent: speakerA, turnOrder: "B", isForced: false },
          { speaker: speakerA, opponent: speakerB, turnOrder: "A", isForced: false },
        ];
      }

      return [
        { speaker: speakerA, opponent: speakerB, turnOrder: "A", isForced: false },
        { speaker: speakerB, opponent: speakerA, turnOrder: "B", isForced: false },
      ];
    }

    if (forcedSpeakerId === speakerA.id) {
      return [
        { speaker: speakerA, opponent: speakerB, turnOrder: "forced", isForced: true },
        { speaker: speakerB, opponent: speakerA, turnOrder: "B", isForced: false },
      ];
    }

    if (forcedSpeakerId === speakerB.id) {
      return [
        { speaker: speakerB, opponent: speakerA, turnOrder: "forced", isForced: true },
        { speaker: speakerA, opponent: speakerB, turnOrder: "A", isForced: false },
      ];
    }

    throw new ChatFlowError(
      "DEBATE_CHARACTER_NOT_FOUND",
      "forcedSpeakerId no pertenece a los personajes del debate",
      "validation",
      false
    );
  }

  private async generateDebateRoundSuggestions(params: {
    conversationId: string;
    userText: string;
    history: Array<Pick<Message, "role" | "content">>;
    currentSpeaker: Character;
    opponent: Character;
    traceCtx: Record<string, unknown>;
  }): Promise<string[] | undefined> {
    try {
      const suggestionsPrompt = buildModeSuggestionsPrompt({
        mode: "debate",
        lastMessages: params.history,
        characterName: params.currentSpeaker.name,
        debate: {
          currentSpeaker: {
            id: params.currentSpeaker.id,
            name: params.currentSpeaker.name,
            role: params.currentSpeaker.role,
          },
          opponent: {
            id: params.opponent.id,
            name: params.opponent.name,
            role: params.opponent.role,
          },
        },
      });

      const suggestionsResponse = await this.llm.generateResponse(
        "You are a helpful assistant that generates follow-up suggestions.",
        [],
        suggestionsPrompt,
        undefined,
        suggestionsSchema
      );

      if (!suggestionsResponse.structuredOutput) {
        return undefined;
      }

      const parsed = suggestionsResponse.structuredOutput as { suggestions?: string[] };
      return parsed.suggestions
        ?.filter((s) => typeof s === "string" && s.length > 0)
        .map((s) => sanitizeAssistantOutput(s, {
          allowJsonEnvelope: false,
          rejectCodeLikeContent: true,
        }))
        .slice(0, 3);
    } catch (error) {
      logger.warn("[chat.processDebateMessage] suggestions generation failed, proceeding without", {
        ...params.traceCtx,
        conversationId: params.conversationId,
        userTextLength: params.userText.length,
        error: serializeError(error),
      });
      return undefined;
    }
  }

  private getNextSpeakerId(plans: DebateSpeakerPlan[]): string | undefined {
    if (plans.length === 0) {
      return undefined;
    }

    return plans[0].speaker.id;
  }

  async processTextMessage(
    conversationId: string,
    userId: string,
    userText: string,
    mode?: ConversationMode,
    trace?: RequestTraceContext
  ): Promise<ChatResponse> {
    this.assertValidUserInput(userText, "processTextMessage");

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

  async processDebateAudioMessage(input: {
    conversationId: string;
    userId: string;
    audioBuffer: Buffer;
    mimeType: string;
    trace?: RequestTraceContext;
    callbacks?: DebateProgressCallbacks;
    forcedSpeakerId?: string | null;
    manualSkips?: Record<string, string | undefined>;
  }): Promise<DebateTurnResult> {
    const traceCtx = createTraceContext(input.trace, {
      conversationId: input.conversationId,
      userId: input.userId,
      phase: "process_debate_audio_message",
    });

    logger.debug("[chat.processDebateAudioMessage] started", {
      ...traceCtx,
      mimeType: input.mimeType,
      audioBytes: input.audioBuffer.length,
    });

    const conversation = await this.getConversation(input.conversationId, input.userId);

    if (!conversation.secondaryCharacterId || !conversation.secondaryCharacter) {
      throw new ChatFlowError(
        "DEBATE_NOT_AVAILABLE",
        "La conversación no está configurada en modo debate",
        "validation",
        false
      );
    }

    const userAudioExtension = getFileExtensionFromMimeType(input.mimeType);
    const audioReference = `audio_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const userAudioPath = `${input.userId}/${input.conversationId}/${audioReference}.${userAudioExtension}`;
    const encoding = getEncodingFromMimeType(input.mimeType);

    logger.debug("[chat.processDebateAudioMessage] user_audio_prepared", {
      ...traceCtx,
      userAudioExtension,
      userAudioPath,
      encoding,
    });

    const [uploadResult, sttResult] = await Promise.allSettled([
      this.storageService.uploadFile(this.storageBucket, userAudioPath, input.audioBuffer, input.mimeType),
      this.voice.transcribe(input.audioBuffer, encoding),
    ]);

    logger.debug("[chat.processDebateAudioMessage] upload_stt_completed", {
      ...traceCtx,
      uploadStatus: uploadResult.status,
      sttStatus: sttResult.status,
      uploadError: uploadResult.status === "rejected" ? serializeError(uploadResult.reason) : undefined,
      sttError: sttResult.status === "rejected" ? serializeError(sttResult.reason) : undefined,
    });

    if (sttResult.status === "rejected") {
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
      throw new ChatFlowError(
        "NO_SPEECH",
        "No se detectó habla en el audio. Inténtalo de nuevo.",
        "stt",
        true
      );
    }

    if (uploadResult.status === "rejected") {
      throw new ChatFlowError(
        "AUDIO_UPLOAD_FAILED",
        "No se pudo subir el audio",
        "upload",
        true,
        uploadResult.reason
      );
    }

    logger.debug("[chat.processDebateAudioMessage] transcription_ready", {
      ...traceCtx,
      transcriptionLength: transcription.length,
      uploadedUserAudioPath: uploadResult.value,
    });

    return this.processDebateMessage(
      input.conversationId,
      input.userId,
      transcription,
      input.trace,
      input.callbacks,
      {
        forcedSpeakerId: input.forcedSpeakerId,
        manualSkips: input.manualSkips,
        userAudio: {
          audioPath: uploadResult.value,
          mimeType: input.mimeType,
        },
      }
    );
  }

  async processDebateMessage(
    conversationId: string,
    userId: string,
    userText: string,
    trace?: RequestTraceContext,
    callbacks?: DebateProgressCallbacks,
    options?: DebateProcessOptions
  ): Promise<DebateTurnResult> {
    this.assertValidUserInput(userText, "processDebateMessage");

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
    const manualSkips = options?.manualSkips ?? {};
    const configuredNextSpeakerId = conversation.nextSpeakerId ?? conversation.preferredOpeningSpeakerId ?? speakerA.id;
    const explicitForcedSpeakerId = options?.forcedSpeakerId ?? null;

    let effectiveForcedSpeakerId: string | null = explicitForcedSpeakerId;
    let inferenceDetails: DebateSpeakerInferenceDetails | undefined;

    if (explicitForcedSpeakerId) {
      inferenceDetails = {
        method: "explicit_forced",
        selectedSpeakerId: explicitForcedSpeakerId,
      };
    } else if (conversation.debateTurnMode === "manual") {
      inferenceDetails = {
        method: "manual_mode",
        selectedSpeakerId: configuredNextSpeakerId,
      };
    } else {
      const detectedSpeaker = detectDebateMentionedSpeaker({
        userText,
        speakerA,
        speakerB,
        minConfidence: env.DEBATE_SPEAKER_INFERENCE_THRESHOLD,
      });

      if (detectedSpeaker.speakerId) {
        effectiveForcedSpeakerId = detectedSpeaker.speakerId;
        inferenceDetails = {
          method: "text_mention",
          selectedSpeakerId: detectedSpeaker.speakerId,
          mentionText: detectedSpeaker.mentionText,
          confidence: detectedSpeaker.confidence,
        };
      } else {
        inferenceDetails = {
          method: "fallback_next_speaker",
          selectedSpeakerId: configuredNextSpeakerId,
        };
      }
    }

    logger.debug("[chat.processDebateMessage] debate_turn_selection_resolved", {
      ...traceCtx,
      configuredNextSpeakerId,
      explicitForcedSpeakerId,
      effectiveForcedSpeakerId,
      inferenceMethod: inferenceDetails?.method,
      inferredSpeakerId: inferenceDetails?.selectedSpeakerId,
      mentionConfidence: inferenceDetails?.confidence,
      mentionText: inferenceDetails?.mentionText,
    });

    const inferenceTurnMetadata = {
      inferenceMethod: inferenceDetails.method,
      detectedMentionText: inferenceDetails.mentionText,
      mentionConfidence: inferenceDetails.confidence,
    };

    const plans = this.resolveDebatePlans(
      speakerA,
      speakerB,
      configuredNextSpeakerId,
      effectiveForcedSpeakerId
    );

    logger.debug("[chat.processDebateMessage] debate_turn_plans_resolved", {
      ...traceCtx,
      plans: plans.map((plan) => ({
        speakerId: plan.speaker.id,
        speakerName: plan.speaker.name,
        opponentId: plan.opponent.id,
        turnOrder: plan.turnOrder,
        isForced: plan.isForced,
      })),
      manualSkipSpeakerIds: Object.keys(manualSkips),
    });

    for (const manualSkipSpeakerId of Object.keys(manualSkips)) {
      if (manualSkipSpeakerId !== speakerA.id && manualSkipSpeakerId !== speakerB.id) {
        throw new ChatFlowError(
          "INVALID_DEBATE_CONFIGURATION",
          "manual skip para speaker no perteneciente al debate",
          "validation",
          false
        );
      }
    }

    // Track persisted message IDs for compensating cleanup on failure
    const persistedMessageIds: number[] = [];

    // 2. Persist user message early
    const userMessage = await this.dataSource.transaction(async (manager) => {
      return manager.save(Message, {
        conversationId,
        role: "user",
        content: userText,
        mediaType: options?.userAudio?.mimeType,
        audioPath: options?.userAudio?.audioPath,
        audioStorageId: options?.userAudio?.audioPath,
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

    // 3. Generate rounds with flexible order and skip capability
    const responses: DebateTurnCharacterResult[] = [];
    let skipsCount = 0;
    const roundHistory: Array<Pick<Message, "role" | "content">> = [...baseHistory];

    for (const plan of plans) {
      const manualSkipReason = manualSkips[plan.speaker.id];

      logger.debug("[chat.processDebateMessage] debate_turn_evaluation_started", {
        ...traceCtx,
        speakerId: plan.speaker.id,
        speakerName: plan.speaker.name,
        turnOrder: plan.turnOrder,
        isForced: plan.isForced,
        hasManualSkip: manualSkipReason != null,
      });

      callbacks?.onTyping({
        speakerId: plan.speaker.id,
        speakerName: plan.speaker.name,
        turnOrder: plan.turnOrder,
        isForced: plan.isForced,
      });

      logger.debug("[chat.processDebateMessage] debate_typing_emitted", {
        ...traceCtx,
        speakerId: plan.speaker.id,
        turnOrder: plan.turnOrder,
        isForced: plan.isForced,
      });
      if (manualSkipReason != null) {
        logger.debug("[chat.processDebateMessage] debate_turn_manual_skip_selected", {
          ...traceCtx,
          speakerId: plan.speaker.id,
          speakerName: plan.speaker.name,
          turnOrder: plan.turnOrder,
          isForced: plan.isForced,
          manualSkipReason,
        });

        let skipMessage: Message;
        try {
          skipMessage = await this.dataSource.transaction(async (manager) => {
            return manager.save(Message, {
              conversationId,
              role: "event",
              content: "",
              speakerCharacterId: plan.speaker.id,
              eventType: "debate_turn_skip",
              eventMetaJson: {
                reason: "manual_user",
                reasonDetail: manualSkipReason,
                turnOrder: plan.turnOrder,
                isForced: plan.isForced,
              },
            });
          });
          persistedMessageIds.push(skipMessage.id);
        } catch (error) {
          await this.cleanupDebateMessages(persistedMessageIds, traceCtx);
          throw this.toChatFlowError(
            error,
            "AI_RESPONSE_FAILED",
            `No se pudo persistir skip manual del personaje ${plan.speaker.name}`
          );
        }
        skipsCount += 1;
        callbacks?.onTurnSkipped({
          messageId: skipMessage.id,
          speakerId: plan.speaker.id,
          speakerName: plan.speaker.name,
          turnOrder: plan.turnOrder,
          reason: "manual_user",
          reasonDetail: manualSkipReason,
          isForced: plan.isForced,
          ...inferenceTurnMetadata,
        });
        responses.push({
          messageId: skipMessage.id,
          speakerId: plan.speaker.id,
          speakerName: plan.speaker.name,
          skipped: true,
          skipReason: "manual_user",
          skipReasonDetail: manualSkipReason,
          isForced: plan.isForced,
          ...inferenceTurnMetadata,
        });
        continue;
      }

      const context = await this.vectorStore.getContext(
        userText,
        plan.speaker.vectorDbName || "default"
      );

      const systemPrompt = buildModeSystemPrompt({
        character: plan.speaker,
        mode: "debate",
        debate: {
          currentSpeaker: { id: plan.speaker.id, name: plan.speaker.name, role: plan.speaker.role },
          opponent: { id: plan.opponent.id, name: plan.opponent.name, role: plan.opponent.role },
          turnOrder: plan.turnOrder,
          isForcedTurn: plan.isForced,
          allowSkip: true,
        },
      });

      let decision: DebateDecisionOutput | null = null;
      let decisionSource: DebateDecisionSource | null = null;
      let fallbackText = "";
      try {
        const aiDecision = await this.llm.generateResponse(
          systemPrompt,
          roundHistory as Message[],
          userText,
          context,
          debateTurnSchema
        );

        const parsedDecision = this.parseDebateDecision(aiDecision.structuredOutput ?? aiDecision.text);
        decision = parsedDecision.decision;
        decisionSource = parsedDecision.source;
        fallbackText = aiDecision.text;
      } catch (error) {
        await this.cleanupDebateMessages(persistedMessageIds, traceCtx);
        throw this.toChatFlowError(
          error,
          "AI_RESPONSE_FAILED",
          `No se pudo generar respuesta del personaje ${plan.speaker.name}`
        );
      }

      const threshold = env.DEBATE_SKIP_CONFIDENCE_THRESHOLD;
      const confidence = decision?.confidence ?? 0.5;
      const shouldSkipForLowConfidence = confidence < threshold;
      const shouldSkip = decision?.action === "skip" || shouldSkipForLowConfidence;
      const rawDebateOutput = decision?.text ?? fallbackText;

      logger.debug("[chat.processDebateMessage] debate_turn_decision_evaluated", {
        ...traceCtx,
        speakerId: plan.speaker.id,
        speakerName: plan.speaker.name,
        turnOrder: plan.turnOrder,
        isForced: plan.isForced,
        llmAction: decision?.action ?? null,
        decisionSource,
        llmSkipReason: decision?.skipReason ?? null,
        llmReason: decision?.reason ?? null,
        llmTextLength: decision?.text?.length ?? fallbackText.length,
        confidence,
        confidenceThreshold: threshold,
        shouldSkipForLowConfidence,
        shouldSkip,
      });

      logger.debug("[chat.processDebateMessage] debate_turn_llm_output", {
        ...traceCtx,
        speakerId: plan.speaker.id,
        speakerName: plan.speaker.name,
        turnOrder: plan.turnOrder,
        isForced: plan.isForced,
        llmAction: decision?.action ?? null,
        decisionSource,
        rawOutput: rawDebateOutput,
      });

      if (shouldSkip) {
        const skipReason: DebateSkipReason = shouldSkipForLowConfidence
          ? "auto_low_confidence"
          : decision?.skipReason ?? "unknown";
        const skipDetail = decision?.reason ?? "Sin contexto suficiente para responder con calidad.";

        logger.debug("[chat.processDebateMessage] debate_turn_auto_skip_selected", {
          ...traceCtx,
          speakerId: plan.speaker.id,
          speakerName: plan.speaker.name,
          turnOrder: plan.turnOrder,
          isForced: plan.isForced,
          skipReason,
          skipDetail,
          confidence,
          confidenceThreshold: threshold,
          triggeredByModelSkip: decision?.action === "skip",
          triggeredByLowConfidence: shouldSkipForLowConfidence,
        });

        let skipMessage: Message;
        try {
          skipMessage = await this.dataSource.transaction(async (manager) => {
            return manager.save(Message, {
              conversationId,
              role: "event",
              content: "",
              speakerCharacterId: plan.speaker.id,
              eventType: "debate_turn_skip",
              eventMetaJson: {
                reason: skipReason,
                reasonDetail: skipDetail,
                confidence,
                turnOrder: plan.turnOrder,
                isForced: plan.isForced,
              },
            });
          });
          persistedMessageIds.push(skipMessage.id);
        } catch (error) {
          await this.cleanupDebateMessages(persistedMessageIds, traceCtx);
          throw this.toChatFlowError(
            error,
            "AI_RESPONSE_FAILED",
            `No se pudo persistir skip automático del personaje ${plan.speaker.name}`
          );
        }
        skipsCount += 1;
        callbacks?.onTurnSkipped({
          messageId: skipMessage.id,
          speakerId: plan.speaker.id,
          speakerName: plan.speaker.name,
          turnOrder: plan.turnOrder,
          reason: skipReason,
          reasonDetail: skipDetail,
          confidence,
          isForced: plan.isForced,
          ...inferenceTurnMetadata,
        });
        responses.push({
          messageId: skipMessage.id,
          speakerId: plan.speaker.id,
          speakerName: plan.speaker.name,
          skipped: true,
          skipReason,
          skipReasonDetail: skipDetail,
          confidence,
          isForced: plan.isForced,
          ...inferenceTurnMetadata,
        });
        continue;
      }

      let responseText = rawDebateOutput.trim();
      try {
        responseText = sanitizeAssistantOutput(responseText, {
          allowJsonEnvelope: true,
          rejectCodeLikeContent: true,
        });
      } catch (error) {
        logger.debug("[chat.processDebateMessage] debate_turn_output_sanitization_failed", {
          ...traceCtx,
          speakerId: plan.speaker.id,
          speakerName: plan.speaker.name,
          turnOrder: plan.turnOrder,
          isForced: plan.isForced,
          llmAction: decision?.action ?? null,
          decisionSource,
          sanitizationError: error instanceof Error ? error.message : String(error),
          rawOutput: rawDebateOutput,
        });
        responseText = "";
      }

      if (!responseText) {
        logger.debug("[chat.processDebateMessage] debate_turn_empty_response_skip_selected", {
          ...traceCtx,
          speakerId: plan.speaker.id,
          speakerName: plan.speaker.name,
          turnOrder: plan.turnOrder,
          isForced: plan.isForced,
          confidence,
          llmAction: decision?.action ?? null,
        });

        let skipMessage: Message;
        try {
          skipMessage = await this.dataSource.transaction(async (manager) => {
            return manager.save(Message, {
              conversationId,
              role: "event",
              content: "",
              speakerCharacterId: plan.speaker.id,
              eventType: "debate_turn_skip",
              eventMetaJson: {
                reason: "unknown",
                reasonDetail: "No se obtuvo contenido conversacional valido.",
                confidence,
                turnOrder: plan.turnOrder,
                isForced: plan.isForced,
              },
            });
          });
          persistedMessageIds.push(skipMessage.id);
        } catch (error) {
          await this.cleanupDebateMessages(persistedMessageIds, traceCtx);
          throw this.toChatFlowError(
            error,
            "AI_RESPONSE_FAILED",
            `No se pudo persistir skip vacío del personaje ${plan.speaker.name}`
          );
        }
        skipsCount += 1;
        callbacks?.onTurnSkipped({
          messageId: skipMessage.id,
          speakerId: plan.speaker.id,
          speakerName: plan.speaker.name,
          turnOrder: plan.turnOrder,
          reason: "unknown",
          reasonDetail: "No se obtuvo contenido conversacional valido.",
          confidence,
          isForced: plan.isForced,
          ...inferenceTurnMetadata,
        });
        responses.push({
          messageId: skipMessage.id,
          speakerId: plan.speaker.id,
          speakerName: plan.speaker.name,
          skipped: true,
          skipReason: "unknown",
          skipReasonDetail: "No se obtuvo contenido conversacional valido.",
          confidence,
          isForced: plan.isForced,
          ...inferenceTurnMetadata,
        });
        continue;
      }

      let speakerMessage: Message;
      try {
        speakerMessage = await this.dataSource.transaction(async (manager) => {
          return manager.save(Message, {
            conversationId,
            role: "assistant",
            content: responseText,
            speakerCharacterId: plan.speaker.id,
          });
        });
        persistedMessageIds.push(speakerMessage.id);
      } catch (error) {
        await this.cleanupDebateMessages(persistedMessageIds, traceCtx);
        throw this.toChatFlowError(
          error,
          "AI_RESPONSE_FAILED",
          `No se pudo persistir respuesta del personaje ${plan.speaker.name}`
        );
      }

      const turnResult: DebateTurnCharacterResult = {
        messageId: speakerMessage.id,
        text: responseText,
        speakerId: plan.speaker.id,
        speakerName: plan.speaker.name,
        confidence,
        isForced: plan.isForced,
        ...inferenceTurnMetadata,
      };

      if (env.DEBATE_TTS_ENABLED) {
        const audioResult = await this.synthesizeAndUpload(
          responseText,
          plan.speaker.voiceId,
          speakerMessage.id,
          userId,
          conversationId,
          { ...traceCtx, speakerId: plan.speaker.id, turnOrder: plan.turnOrder }
        );
        if ("audioBase64" in audioResult) {
          turnResult.audioBase64 = audioResult.audioBase64;
        } else {
          turnResult.warning = audioResult.warning;
        }
      }

      logger.debug("[chat.processDebateMessage] debate_speaker_emitted", {
        ...traceCtx,
        messageId: speakerMessage.id,
        speakerId: plan.speaker.id,
        turnOrder: plan.turnOrder,
      });

      callbacks?.onTurnReady({ ...turnResult, turnOrder: plan.turnOrder });
      responses.push(turnResult);
      roundHistory.push({ role: "assistant", content: responseText });
    }

    const nextSpeakerId = effectiveForcedSpeakerId
      ? configuredNextSpeakerId
      : this.getNextSpeakerId(plans);

    await this.conversationRepo.update(
      { id: conversationId, userId },
      {
        nextSpeakerId,
        lastForcedSpeakerId: options?.forcedSpeakerId ?? null,
      } as Partial<Conversation>
    );

    // 4. Round complete
    const warnings: DebateWarningPayload[] = responses
      .map((r) => r.warning)
      .filter((w): w is DebateWarningPayload => w != null);

    callbacks?.onRoundCompleted({
      warnings: warnings.length > 0 ? warnings : undefined,
      responsesCount: responses.filter((r) => !r.skipped).length,
      skipsCount,
      nextSpeakerId,
      inferenceDetails,
    });

    const nextSpeaker = nextSpeakerId === speakerB.id ? speakerB : speakerA;
    const opponent = nextSpeaker.id === speakerA.id ? speakerB : speakerA;
    const suggestionHistory: Array<Pick<Message, "role" | "content">> = [
      ...baseHistory,
      { role: "user", content: userText },
      ...responses
        .filter((response): response is DebateTurnCharacterResult & { text: string } =>
          !response.skipped && Boolean(response.text)
        )
        .map((response) => ({ role: "assistant" as const, content: response.text! })),
    ];

    const suggestions = await this.generateDebateRoundSuggestions({
      conversationId,
      userText,
      history: suggestionHistory,
      currentSpeaker: nextSpeaker,
      opponent,
      traceCtx,
    });

    if (suggestions && suggestions.length > 0) {
      callbacks?.onSuggestionsReady?.({ suggestions });
    }

    logger.debug("[chat.processDebateMessage] debate_round_completed", {
      ...traceCtx,
      userMessageId: userMessage.id,
      responseCount: responses.filter((r) => !r.skipped).length,
      skipsCount,
      nextSpeakerId,
      suggestionsCount: suggestions?.length ?? 0,
      forcedSpeakerId: explicitForcedSpeakerId,
      effectiveForcedSpeakerId,
      inferenceMethod: inferenceDetails.method,
      mentionText: inferenceDetails.mentionText,
      mentionConfidence: inferenceDetails.confidence,
    });

    return {
      userMessageId: userMessage.id,
      userText,
      responses,
      responsesCount: responses.filter((r) => !r.skipped).length,
      skipsCount,
      nextSpeakerId,
      inferenceDetails,
    };
  }
}
