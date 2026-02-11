import { Server, Socket } from 'socket.io';
import { RealtimeAudioService } from '../../application/services/realtime-audio.service.js';

/**
 * WebSocket Gateway for real-time multimodal conversation.
 * Operates on the '/realtime' namespace to isolate heavy binary traffic.
 */
export class LiveAudioGateway {
  private io: Server;
  private activeSessions: Map<string, RealtimeAudioService> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.initializeNamespace();
  }

  private initializeNamespace(): void {
    const namespace = this.io.of('/realtime');

    namespace.on('connection', (socket: Socket) => {
      const service = new RealtimeAudioService();
      this.activeSessions.set(socket.id, service);

      service.initialize({
        onOpen: () => socket.emit('open'),
        onAudio: (buffer) => socket.emit('audio-out', buffer),
        onText: (text) => socket.emit('text-out', text),
        onInterrupted: () => socket.emit('interrupted'),
        onError: (message) => socket.emit('error', { message }),
      }).catch((err) => {
        socket.emit('error', { message: 'Initialization failed' });
        socket.disconnect();
      });

      /**
       * Expected event: 'audio-in'
       * Payload: Raw Buffer (PCM 16-bit)
       */
      socket.on('audio-in', async (data: Buffer) => {
        console.log(`Bytes recibidos del cliente: ${data.byteLength}, esBuffer: ${Buffer.isBuffer(data)}`);
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
        await service.handleClientAudio(buffer);
      });

      socket.on('disconnect', () => {
        service.destroy();
        this.activeSessions.delete(socket.id);
      });
    });
  }
}