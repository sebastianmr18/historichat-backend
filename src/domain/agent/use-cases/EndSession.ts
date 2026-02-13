// src/domain/agent/use-cases/EndSession.ts

import { ISessionRepository } from '../repositories/ISessionRepository.js';
import { IGeminiLiveClient } from '../../../infrastructure/ai/GeminiLiveClient.js';

export interface EndSessionInput { sessionId: string; }

export class EndSession {
  constructor(private sessionRepository: ISessionRepository, private geminiClient: IGeminiLiveClient) {}

  async execute(input: EndSessionInput): Promise<void> {
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) return;
    await this.geminiClient.disconnect(input.sessionId);
    session.markAsDisconnected();
    await this.sessionRepository.save(session);
  }
}