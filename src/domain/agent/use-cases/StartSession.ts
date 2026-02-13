// src/domain/agent/use-cases/StartSession.ts

import { Session } from '../entities/Session.js';
import { ISessionRepository } from '../repositories/ISessionRepository.js';
import { IGeminiLiveClient } from '../../../infrastructure/ai/GeminiLiveClient.js';
import { v4 as uuidv4 } from 'uuid';

export interface StartSessionInput { systemInstruction: string; }
export interface StartSessionOutput { sessionId: string; }

export class StartSession {
  constructor(private sessionRepository: ISessionRepository, private geminiClient: IGeminiLiveClient) {}

  async execute(input: StartSessionInput): Promise<StartSessionOutput> {
    const sessionId = uuidv4();
    const session = new Session(sessionId);
    session.markAsConnecting();
    await this.sessionRepository.save(session);

    try {
      await this.geminiClient.connect(sessionId, input.systemInstruction);
      session.markAsConnected();
      await this.sessionRepository.save(session);
      return { sessionId };
    } catch (error) {
      session.markAsError();
      await this.sessionRepository.save(session);
      throw error;
    }
  }
}