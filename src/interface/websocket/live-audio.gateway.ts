import { Server, Socket } from 'socket.io';
import { StartSession } from '../../domain/agent/use-cases/StartSession.js';
import { HandleAudioInput } from '../../domain/agent/use-cases/HandleAudioInput.js';
import { EndSession } from '../../domain/agent/use-cases/EndSession.js';
import { IWebSocketNotifier } from './INotifier.js';

export class LiveAudioGateway implements IWebSocketNotifier {
  private sessions: Map<string, string> = new Map(); // socketId -> sessionId

  constructor(
    private io: Server,
    private startSession: StartSession,
    private handleAudioInput: HandleAudioInput,
    private endSession: EndSession
  ) {
    this.io.on('connection', this.handleConnection.bind(this));
  }

  private handleConnection(socket: Socket) {
    console.log(`[LiveAudio] Cliente conectado: ${socket.id}`);
    socket.emit('connected', { socketId: socket.id });

    socket.on('start', async (data: { systemInstruction: string }) => {
      console.log(`[LiveAudio] Recibido start de ${socket.id}`);
      try {
        const output = await this.startSession.execute({ systemInstruction: data.systemInstruction });
        this.sessions.set(socket.id, output.sessionId);
        socket.emit('session-ready', { sessionId: output.sessionId });
        console.log(`[LiveAudio] Sesión lista: ${output.sessionId} para socket ${socket.id}`);
      } catch (error: any) {
        console.error(`[LiveAudio] Error en start:`, error);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('audio', (audioChunk: Buffer) => {
      const sessionId = this.sessions.get(socket.id);
      if (!sessionId) {
        console.warn(`[LiveAudio] Audio recibido sin sesión activa de ${socket.id}`);
        socket.emit('error', { message: 'No hay sesión activa. Envía "start" primero.' });
        return;
      }
      console.log(`[LiveAudio] Chunk de audio recibido de ${socket.id}, tamaño: ${audioChunk.length} bytes`);
      try {
        this.handleAudioInput.execute({ sessionId, audioChunk }).catch(err => {
          console.error(`[LiveAudio] Error procesando audio:`, err);
        });
      } catch (error: any) {
        console.error(`[LiveAudio] Error al recibir audio:`, error);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', async () => {
      const sessionId = this.sessions.get(socket.id);
      if (sessionId) {
        console.log(`[LiveAudio] Cliente ${socket.id} desconectado, cerrando sesión ${sessionId}`);
        try {
          await this.endSession.execute({ sessionId });
        } catch (error) {
          console.error(`Error al finalizar sesión ${sessionId}:`, error);
        } finally {
          this.sessions.delete(socket.id);
        }
      } else {
        console.log(`[LiveAudio] Cliente ${socket.id} desconectado (sin sesión activa)`);
      }
    });
  }

  async sendToSession(sessionId: string, message: any): Promise<void> {
    let targetSocketId: string | undefined;
    for (const [sid, sessId] of this.sessions.entries()) {
      if (sessId === sessionId) {
        targetSocketId = sid;
        break;
      }
    }
    if (targetSocketId) {
      this.io.to(targetSocketId).emit(message.type, message.data || {});
      console.log(`[LiveAudio] Mensaje ${message.type} enviado a sesión ${sessionId}`);
    } else {
      console.warn(`No se encontró socket para la sesión ${sessionId}`);
    }
  }
}