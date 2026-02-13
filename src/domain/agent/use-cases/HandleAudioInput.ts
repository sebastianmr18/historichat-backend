// src/domain/agent/use-cases/HandleAudioInput.ts

import { ISessionRepository } from '../repositories/ISessionRepository.js';
import { IGeminiLiveClient } from '../../../infrastructure/ai/GeminiLiveClient.js';

export interface HandleAudioInputInput { sessionId: string; audioChunk: Buffer; }

export class HandleAudioInput {
  constructor(private sessionRepository: ISessionRepository, private geminiClient: IGeminiLiveClient) {}

  async execute(input: HandleAudioInputInput): Promise<void> {
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) throw new Error(`Session ${input.sessionId} not found`);
    if (session.getStatus() !== 'connected') throw new Error(`Session ${input.sessionId} is not connected`);
    await this.geminiClient.sendAudio(input.sessionId, input.audioChunk);
  }
}