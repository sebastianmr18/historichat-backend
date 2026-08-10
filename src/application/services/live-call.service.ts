/**
 * @file live-call.service.ts
 * @description Servicio encargado de coordinar sesiones de llamadas en tiempo real por voz.
 * Controla la conexion con la API en tiempo real de Gemini (GeminiLiveAdapter), gestiona el estado
 * de la sesion, procesa los fragmentos de audio entrantes/salientes, ejecuta busquedas RAG en base a tool calls
 * de Gemini y controla temporizadores de inactividad de las llamadas.
 */

import type { FunctionCall, Session } from '@google/genai';
import fs from 'fs';
import path from 'path';
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

/** Tiempo maximo de inactividad permitido (5 minutos) antes de terminar la llamada. */
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
/** Voz por defecto utilizada en la sesion de Gemini en tiempo real si el personaje no define una. */
const DEFAULT_VOICE = 'Laomedeia';
/** Directorio por defecto para guardar transcripciones de prueba cuando el logger local esta activo. */
const DEFAULT_TEST_LOGGER_DIR = 'testing/outputs/p6-ux/live-call-logs';

function isLiveCallTestLoggerEnabled(): boolean {
  return process.env.LIVE_CALL_TEST_LOGGER_ENABLED === 'true';
}

function getLiveCallTestLoggerDir(): string {
  return process.env.LIVE_CALL_TEST_LOGGER_DIR || DEFAULT_TEST_LOGGER_DIR;
}

/**
 * Servicio de backend para la gestion de llamadas en tiempo real con personajes de IA.
 */
export class LiveCallService {
  /**
   * Mapa en memoria que gestiona el estado de las sesiones activas,
   * utilizando el socketId del cliente como clave.
   */
  private sessions = new Map<string, LiveSessionState>();

  /**
   * Crea una instancia de LiveCallService.
   *
   * @param geminiLive - Adaptador para interactuar con la API de transmision en vivo de Gemini.
   * @param vectorStore - Repositorio de base de datos vectorial para consultas RAG en tiempo real.
   * @param characterRepo - Repositorio relacional para obtener informacion del personaje.
   */
  constructor(
    private geminiLive: GeminiLiveAdapter,
    private vectorStore: ChromaRepository,
    private characterRepo: IRepository<Character>,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Inicia una nueva llamada de voz en tiempo real para un socket y usuario determinados.
   * Si ya existia una sesion activa en el mismo socket, la cierra primero de forma limpia.
   *
   * @param socketId - Identificador del socket de la conexion.
   * @param userId - Identificador del usuario.
   * @param payload - Payload con los parametros de inicio (ID del personaje).
   * @param emitter - Emisor de eventos especifico de la sesion del socket para comunicarse con el cliente.
   */
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

  /**
   * Retransmite un buffer de audio enviado por el cliente directamente a la conexion activa de Gemini.
   *
   * @param socketId - Identificador del socket del cliente.
   * @param audioBuffer - Buffer binario con los datos de audio en bruto del microfono.
   */
  relayAudio(socketId: string, audioBuffer: ArrayBuffer): void {
    const state = this.sessions.get(socketId);
    if (!state?.geminiSession) return;

    const base64 = Buffer.from(audioBuffer).toString('base64');
    this.geminiLive.sendAudio(state.geminiSession as Session, base64);

    state.lastActivityAt = Date.now();
  }

  /**
   * Finaliza una sesion de llamada activa a peticion explicita del usuario.
   *
   * @param socketId - Identificador del socket del cliente.
   * @param emitter - Emisor de eventos de la sesion para notificar el fin (opcional).
   */
  stopSession(socketId: string, emitter?: LiveSessionEmitter): void {
    this.terminateSession(socketId, 'user_request', emitter);
  }

  /**
   * Gestiona el evento de desconexion del socket finalizando de forma abrupta la llamada.
   *
   * @param socketId - Identificador del socket desconectado.
   */
  handleDisconnect(socketId: string): void {
    this.terminateSession(socketId, 'user_request');
  }

  /**
   * Maneja el cambio de estado de silencio (mute) en el cliente.
   * Actualmente se utiliza solo con fines de registro/logging.
   *
   * @param socketId - Identificador del socket del cliente.
   * @param muted - Indica si el microfono del cliente esta silenciado.
   */
  handleMute(socketId: string, muted: boolean): void {
    logger.debug('[live-call.service] mute status changed', { socketId, muted });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Carga el personaje de la base de datos y envia un evento de error si no existe.
   *
   * @param characterId - Identificador del personaje.
   * @param emitter - Emisor de eventos para reportar el error en caso de fallo.
   * @returns La entidad del personaje o null si no se encuentra.
   */
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

  /**
   * Inicializa el objeto que representa el estado de una sesion activa de llamada.
   *
   * @param socketId - Identificador del socket.
   * @param userId - Identificador del usuario.
   * @param payload - Payload de inicio.
   * @param character - Entidad del personaje.
   * @returns Estructura de estado inicializada.
   */
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

  /**
   * Establece conexion websocket con la API en tiempo real de Gemini.
   * Envia las instrucciones de sistema, la configuracion de voz del personaje
   * y configura la sesion en el mapa en memoria de llamadas activas.
   *
   * @param state - Estado de la sesion local actual.
   * @param callbacks - Callbacks definidos para procesar eventos del websocket de Gemini.
   * @param emitter - Emisor de eventos del socket del cliente.
   * @param sessionId - Identificador unico asignado a la sesion de llamada.
   * @param character - Entidad del personaje.
   */
  private async connectGemini(
    state: LiveSessionState,
    callbacks: GeminiLiveCallbacks,
    emitter: LiveSessionEmitter,
    sessionId: string,
    character: Character,
  ): Promise<void> {
    let voiceName = character.voiceId || DEFAULT_VOICE;

    // Extraer solo el nombre de Gemini si viene en formato combinado (ej. es-ES-Chirp3-HD-Kore)
    const parts = voiceName.split('-');
    if (parts.length > 1) {
      voiceName = parts[parts.length - 1]; // Toma la ultima parte: "Kore"
    }

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

  /**
   * Finaliza una llamada por cualquier motivo (peticion, cierre de Gemini, timeout, error).
   * Cierra las conexiones activas, persiste el historial de transcripciones (si aplica) y limpia los timers.
   *
   * @param socketId - Identificador del socket del cliente.
   * @param reason - Causa de la terminacion de la llamada.
   * @param emitter - Emisor del cliente para enviarle el evento 'ended'.
   */
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

    this.persistTranscriptForTesting(state, reason, durationMs);

    emitter?.emitEnded({ reason, durationMs });
    this.cleanupSession(socketId);
  }

  /**
   * Guarda de forma local en disco la transcripcion completa de la conversacion para fines de pruebas
   * si la variable de entorno correspondiente esta activada.
   *
   * @param state - Estado de la sesion terminada.
   * @param reason - Causa de finalizacion.
   * @param durationMs - Duracion total de la llamada en milisegundos.
   */
  private persistTranscriptForTesting(
    state: LiveSessionState,
    reason: 'user_request' | 'gemini_closed' | 'timeout' | 'error',
    durationMs: number,
  ): void {
    if (!isLiveCallTestLoggerEnabled()) {
      return;
    }

    try {
      const loggerDir = getLiveCallTestLoggerDir();
      const logsDir = path.isAbsolute(loggerDir)
        ? loggerDir
        : path.resolve(process.cwd(), loggerDir);
      fs.mkdirSync(logsDir, { recursive: true });

      const output = {
        generatedAt: new Date().toISOString(),
        socketId: state.socketId,
        userId: state.userId,
        characterId: state.characterId,
        reason,
        durationMs,
        transcriptHistory: state.transcriptHistory,
      };

      const filePath = path.join(logsDir, `live-call-${state.socketId}-${Date.now()}.json`);
      fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf8');
      logger.info('[live-call.service] test transcript persisted', {
        socketId: state.socketId,
        filePath,
      });
    } catch (error) {
      logger.error('[live-call.service] failed to persist test transcript', {
        socketId: state.socketId,
        error,
      });
    }
  }

  /**
   * Construye el conjunto de callbacks que responderan a los eventos enviados por el WebSocket
   * de transmision en vivo de Gemini.
   *
   * @param state - Estado de la sesion local.
   * @param emitter - Emisor del cliente para redirigir audios y transcripciones.
   * @param sessionId - Identificador unico de la llamada.
   * @returns Callbacks estructurados requeridos por GeminiLiveAdapter.
   */
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
        // Reiniciar el buffer del modelo porque su respuesta fue interrumpida/cortada
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

  /**
   * Envia las transcripciones del bufer temporal acumulado durante el turno al socket
   * del cliente y las guarda en el historial de la llamada.
   *
   * @param state - Estado de la llamada.
   * @param emitter - Emisor del cliente.
   */
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

  /**
   * Procesa las llamadas a herramientas (RAG Tool Calls) gatilladas de forma autonoma por Gemini.
   * Realiza la busqueda de informacion contextual en ChromaDB y envia el fragmento recuperado
   * de vuelta a la sesion del LLM para enriquecer su base de conocimientos durante la llamada.
   *
   * @param state - Estado de la llamada.
   * @param functionCalls - Lista de llamadas a funciones enviadas por Gemini.
   * @param emitter - Emisor del cliente.
   * @param sessionId - ID de la sesion.
   */
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

  /**
   * Resetea el temporizador de inactividad de una llamada.
   * Comprueba periodicamente cada 30 segundos si ha transcurrido mas del tiempo limite permitido
   * sin transmision de audio o actividad de usuario para terminar la llamada por inactividad.
   *
   * @param state - Estado de la sesion de llamada.
   * @param emitter - Emisor del cliente.
   */
  private resetInactivityTimer(state: LiveSessionState, emitter: LiveSessionEmitter | null): void {
    if (state.inactivityTimer) {
      clearInterval(state.inactivityTimer);
    }

    // Comprobar cada 30s en lugar de recrear un setTimeout en cada trozo de audio (mas eficiente)
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

  /**
   * Elimina y limpia las referencias e intervalos de una llamada del mapa en memoria.
   *
   * @param socketId - Identificador de socket de la llamada a limpiar.
   */
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
