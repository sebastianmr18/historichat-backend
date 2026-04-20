import type { FunctionCall, Session } from '@google/genai';
import type {
  LiveSessionState,
  LiveStartPayload,
  LiveSessionEmitter,
} from '../../domain/live/live.types.js';
import type { GeminiLiveAdapter, GeminiLiveCallbacks } from '../../infrastructure/ai/gemini-live.adapter.js';
import type { Character } from '../../infrastructure/database/entities/Character.js';
import { logger } from '../../infrastructure/logging/logger.js';
import type { ChromaRepository } from '../../infrastructure/vector/chroma.repository.js';
import type { IRepository } from '../../domain/repositories/repository.interfaces.js';
import { buildModeSystemPrompt } from '../prompts/system-prompt-builder.js';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_VOICE = 'Kore';

export class LiveCallService {
  private sessions = new Map<string, LiveSessionState>();

  constructor(
    private geminiLive: GeminiLiveAdapter,
    private vectorStore: ChromaRepository,
    private characterRepo: IRepository<Character>,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async startSession(
    socketId: string,
    userId: string,
    payload: LiveStartPayload,
    emitter: LiveSessionEmitter,
  ): Promise<void> {
    if (this.sessions.has(socketId)) {
      this.cleanupSession(socketId);
    }

    const character = await this.loadCharacter(payload.characterId, emitter);
    if (!character) return;

    const sessionId = `live_${socketId}_${Date.now()}`;
    const state = this.buildSessionState(socketId, userId, payload, character);
    const callbacks = this.buildGeminiCallbacks(state, emitter, sessionId);

    await this.connectGemini(state, callbacks, emitter, sessionId, character);
  }

  relayAudio(socketId: string, audioBuffer: ArrayBuffer): void {
    const state = this.sessions.get(socketId);
    if (!state?.geminiSession) return;

    const base64 = Buffer.from(audioBuffer).toString('base64');
    this.geminiLive.sendAudio(state.geminiSession as Session, base64);

    state.lastActivityAt = Date.now();
  }

  stopSession(socketId: string, emitter?: LiveSessionEmitter): void {
    this.terminateSession(socketId, 'user_request', emitter);
  }

  handleDisconnect(socketId: string): void {
    this.terminateSession(socketId, 'user_request');
  }

  handleMute(socketId: string, muted: boolean): void {
    logger.debug('[live-call.service] mute status changed', { socketId, muted });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async loadCharacter(
    characterId: string,
    emitter: LiveSessionEmitter,
  ): Promise<Character | null> {
    const character = await this.characterRepo.findOne({ where: { id: characterId } } as any);

    if (!character) {
      emitter.emitError({
        code: 'CHARACTER_NOT_FOUND',
        message: 'Personaje no encontrado',
        retryable: false,
      });
      return null;
    }

    return character;
  }

  private buildSessionState(
    socketId: string,
    userId: string,
    payload: LiveStartPayload,
    character: Character,
  ): LiveSessionState {
    const now = Date.now();
    return {
      socketId,
      userId,
      characterId: payload.characterId,
      characterVectorDbName: character.vectorDbName || '',
      geminiSession: null,
      startedAt: now,
      lastActivityAt: now,
      transcriptBuffer: { user: '', model: '' },
      transcriptHistory: [],
      inactivityTimer: null,
    };
  }

  private async connectGemini(
    state: LiveSessionState,
    callbacks: GeminiLiveCallbacks,
    emitter: LiveSessionEmitter,
    sessionId: string,
    character: Character,
  ): Promise<void> {
    const voiceName = character.voiceId || DEFAULT_VOICE;
    const systemInstruction = buildModeSystemPrompt({
      character,
      mode: 'call',
      isRealtime: true,
    });

    logger.info('[live-call.service] starting session', {
      sessionId,
      socketId: state.socketId,
      userId: state.userId,
      characterId: state.characterId,
      voiceName,
    });

    try {
      const session = await this.geminiLive.connect({
        voiceName,
        systemInstruction,
        callbacks,
      });

      state.geminiSession = session;
      this.sessions.set(state.socketId, state);
      this.resetInactivityTimer(state, emitter);

      emitter.emitReady({
        sessionId,
        voiceName,
        characterName: character.name,
      });
    } catch (error) {
      logger.error('[live-call.service] failed to connect to Gemini', {
        sessionId,
        socketId: state.socketId,
        error,
      });
      emitter.emitError({
        code: 'GEMINI_CONNECTION_FAILED',
        message: 'No se pudo establecer conexion con el servicio de voz',
        retryable: true,
      });
    }
  }

  private terminateSession(
    socketId: string,
    reason: 'user_request' | 'gemini_closed' | 'timeout' | 'error',
    emitter?: LiveSessionEmitter,
  ): void {
    const state = this.sessions.get(socketId);
    if (!state) return;

    const durationMs = Date.now() - state.startedAt;

    logger.info('[live-call.service] terminating session', {
      socketId,
      userId: state.userId,
      characterId: state.characterId,
      reason,
      durationMs,
    });

    if (state.geminiSession) {
      this.geminiLive.closeSession(state.geminiSession as Session);
    }

    emitter?.emitEnded({ reason, durationMs });
    this.cleanupSession(socketId);
  }

  private buildGeminiCallbacks(
    state: LiveSessionState,
    emitter: LiveSessionEmitter,
    sessionId: string,
  ): GeminiLiveCallbacks {
    return {
      onReady: () => {
        logger.debug('[live-call.service] Gemini session ready', { sessionId });
      },

      onAudio: (base64Audio: string) => {
        emitter.emitAudio({ audio: base64Audio });
        state.lastActivityAt = Date.now();
      },

      onInputTranscription: (text: string) => {
        state.transcriptBuffer.user += text;
      },

      onOutputTranscription: (text: string) => {
        state.transcriptBuffer.model += text;
      },

      onTurnComplete: () => {
        this.flushTranscriptBuffer(state, emitter);
      },

      onInterrupted: () => {
        emitter.emitInterrupted();
        // Reset model buffer since the response was cut off
        state.transcriptBuffer.model = '';
      },

      onToolCall: (functionCalls: FunctionCall[]) => {
        this.handleRagToolCall(state, functionCalls, emitter, sessionId).catch((error) => {
          logger.error('[live-call.service] RAG tool call unhandled error', {
            sessionId,
            error,
          });
        });
      },

      onError: (error: Error) => {
        logger.error('[live-call.service] Gemini session error', {
          sessionId,
          message: error.message,
        });
        emitter.emitError({
          code: 'GEMINI_SESSION_ERROR',
          message: 'Error en la sesion de voz',
          retryable: false,
        });
      },

      onClose: (reason: string) => {
        const durationMs = Date.now() - state.startedAt;
        logger.info('[live-call.service] Gemini session closed', {
          sessionId,
          reason,
          durationMs,
        });
        emitter.emitEnded({
          reason: 'gemini_closed',
          durationMs,
        });
        this.cleanupSession(state.socketId);
      },
    };
  }

  private flushTranscriptBuffer(state: LiveSessionState, emitter: LiveSessionEmitter): void {
    const { transcriptBuffer } = state;
    const now = Date.now();

    if (transcriptBuffer.user) {
      emitter.emitTranscription({
        role: 'user',
        text: transcriptBuffer.user,
        isFinal: true,
      });
      state.transcriptHistory.push({
        role: 'user',
        text: transcriptBuffer.user,
        timestamp: now,
      });
      transcriptBuffer.user = '';
    }

    if (transcriptBuffer.model) {
      emitter.emitTranscription({
        role: 'model',
        text: transcriptBuffer.model,
        isFinal: true,
      });
      state.transcriptHistory.push({
        role: 'model',
        text: transcriptBuffer.model,
        timestamp: now,
      });
      transcriptBuffer.model = '';
    }
  }

  private async handleRagToolCall(
    state: LiveSessionState,
    functionCalls: FunctionCall[],
    emitter: LiveSessionEmitter,
    sessionId: string,
  ): Promise<void> {
    emitter.emitSearching({ isSearching: true });

    const functionResponses: Array<{ id: string; name: string; response: Record<string, unknown> }> = [];

    for (const fc of functionCalls) {
      const query = (fc.args as Record<string, unknown>)?.query as string | undefined;
      const fcId = fc.id ?? '';
      const fcName = fc.name ?? 'consultar_base_conocimientos';

      logger.info('[live-call.service] RAG tool call', { sessionId, functionName: fcName, query });

      let context = '';
      try {
        if (query && state.characterVectorDbName) {
          context = await this.vectorStore.getContext(query, state.characterVectorDbName);
        }
      } catch (error) {
        logger.error('[live-call.service] RAG query failed', { sessionId, error });
        context = 'Base de conocimientos no disponible en este momento.';
        emitter.emitError({
          code: 'RAG_QUERY_FAILED',
          message: 'Error consultando la base de conocimientos',
          retryable: false,
        });
      }

      functionResponses.push({
        id: fcId,
        name: fcName,
        response: { context: context || 'No se encontro informacion relevante.' },
      });

      logger.info('[live-call.service] RAG tool call completed', {
        sessionId,
        functionName: fcName,
        contextLength: context.length,
      });
    }

    try {
      this.geminiLive.sendToolResponse(state.geminiSession as Session, functionResponses);
    } catch (error) {
      logger.error('[live-call.service] failed to send tool response to Gemini', {
        sessionId,
        error,
      });
    }

    emitter.emitSearching({ isSearching: false });
  }

  private resetInactivityTimer(state: LiveSessionState, emitter: LiveSessionEmitter | null): void {
    if (state.inactivityTimer) {
      clearInterval(state.inactivityTimer);
    }

    // Check every 30s instead of resetting setTimeout on every audio chunk
    state.inactivityTimer = setInterval(() => {
      const idleMs = Date.now() - state.lastActivityAt;
      if (idleMs < INACTIVITY_TIMEOUT_MS) return;

      clearInterval(state.inactivityTimer!);
      const durationMs = Date.now() - state.startedAt;
      logger.info('[live-call.service] session timed out due to inactivity', {
        socketId: state.socketId,
        userId: state.userId,
        durationMs,
      });

      if (state.geminiSession) {
        this.geminiLive.closeSession(state.geminiSession as Session);
      }

      emitter?.emitEnded({ reason: 'timeout', durationMs });
      this.cleanupSession(state.socketId);
    }, 30_000);
  }

  private cleanupSession(socketId: string): void {
    const state = this.sessions.get(socketId);
    if (!state) return;

    if (state.inactivityTimer) {
      clearInterval(state.inactivityTimer);
      state.inactivityTimer = null;
    }

    this.sessions.delete(socketId);
  }
}
