import { Server, Namespace, Socket } from 'socket.io';
import { LiveCallService } from '../../application/services/live-call.service.js';
import { logger } from '../../infrastructure/logging/logger.js';
import { serializeError } from '../../shared/errors.js';
import { generateTraceId } from '../../shared/trace.js';
import { wsAuthMiddleware } from './ws-auth.middleware.js';
import type {
  LiveStartPayload,
  LiveMutePayload,
  LiveSessionEmitter,
} from '../../domain/live/live.types.js';

export class LiveGateway {
  private namespace: Namespace;

  constructor(
    io: Server,
    private liveCallService: LiveCallService,
  ) {
    this.namespace = io.of('/live');
    this.initialize();
  }

  private initialize() {
    this.registerAuthMiddleware();
    this.registerEventHandlers();
  }

  private registerAuthMiddleware() {
    this.namespace.use(wsAuthMiddleware);
  }

  private buildEmitter(socket: Socket): LiveSessionEmitter {
    return {
      emitReady: (payload) => socket.emit('live:ready', payload),
      emitAudio: (payload) => socket.volatile.emit('live:audio', payload),
      emitTranscription: (payload) => socket.emit('live:transcription', payload),
      emitInterrupted: () => socket.volatile.emit('live:interrupted'),
      emitError: (payload) => socket.emit('live:error', payload),
      emitEnded: (payload) => socket.emit('live:ended', payload),
      emitSearching: (payload) => socket.emit('live:searching', payload),
    };
  }

  private registerEventHandlers() {
    this.namespace.on('connection', (socket: Socket) => {
      const userId = socket.data.userId as string;
      logger.info('[live.gateway] client_connected', { socketId: socket.id, userId });

      socket.on('live:start', (payload: LiveStartPayload) =>
        this.handleStart(socket, userId, payload),
      );

      socket.on('live:audio', (audioBuffer: ArrayBuffer) =>
        this.liveCallService.relayAudio(socket.id, audioBuffer),
      );

      socket.on('live:stop', () =>
        this.handleStop(socket),
      );

      socket.on('live:mute', (payload: LiveMutePayload) => {
        logger.debug('[live.gateway] live:mute', { socketId: socket.id, muted: payload.muted });
        this.liveCallService.handleMute(socket.id, payload.muted);
      });

      socket.on('disconnect', () => {
        logger.info('[live.gateway] client_disconnected', { socketId: socket.id });
        this.liveCallService.handleDisconnect(socket.id);
      });
    });
  }

  private async handleStart(socket: Socket, userId: string, payload: LiveStartPayload) {
    const traceId = generateTraceId('live');
    logger.info('[live.gateway] live:start', {
      traceId,
      socketId: socket.id,
      userId,
      characterId: payload.characterId,
    });

    const emitter = this.buildEmitter(socket);

    try {
      await this.liveCallService.startSession(socket.id, userId, payload, emitter);
    } catch (error) {
      logger.error('[live.gateway] live:start failed', {
        traceId,
        socketId: socket.id,
        error: serializeError(error),
      });
      socket.emit('live:error', {
        code: 'INTERNAL_ERROR',
        message: 'Error iniciando sesion de llamada',
        retryable: true,
      });
    }
  }

  private handleStop(socket: Socket) {
    logger.info('[live.gateway] live:stop', { socketId: socket.id });
    const emitter = this.buildEmitter(socket);
    this.liveCallService.stopSession(socket.id, emitter);
  }
}
