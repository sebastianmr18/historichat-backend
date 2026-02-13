import { ISessionRepository } from '../repositories/ISessionRepository.js';
import { IWebSocketNotifier } from '../../../interface/websocket/INotifier.js';

export interface GeminiMessage {
  type: 'audio' | 'transcription' | 'interrupted' | 'turnComplete';
  data?: {
    audio?: string;
    transcription?: string;
    role?: 'user' | 'model';
  };
}

export class HandleGeminiMessage {
  constructor(
    private sessionRepository: ISessionRepository,
    private notifier: IWebSocketNotifier | null
  ) {}

  public setNotifier(notifier: IWebSocketNotifier) {
    this.notifier = notifier;
  }

  async execute(sessionId: string, message: GeminiMessage): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return;
    }

    if (message.type === 'transcription' && message.data) {
      const { role, transcription } = message.data;
      if (role === 'user') session.appendUserTranscript(transcription || '');
      else if (role === 'model') session.appendModelTranscript(transcription || '');
    }

    if (message.type === 'turnComplete') {
      const finalBuffer = session.clearTranscriptBuffer();
      if (this.notifier) {
        if (finalBuffer.user) {
          await this.notifier.sendToSession(sessionId, {
            type: 'transcription',
            data: { role: 'user', text: finalBuffer.user }
          });
        }
        if (finalBuffer.model) {
          await this.notifier.sendToSession(sessionId, {
            type: 'transcription',
            data: { role: 'model', text: finalBuffer.model }
          });
        }
      }
    }

    if (message.type === 'audio' && message.data?.audio && this.notifier) {
      await this.notifier.sendToSession(sessionId, {
        type: 'audio',
        data: { audio: message.data.audio }
      });
    }

    if (message.type === 'interrupted' && this.notifier) {
      await this.notifier.sendToSession(sessionId, { type: 'interrupted' });
    }

    await this.sessionRepository.save(session);
  }
}