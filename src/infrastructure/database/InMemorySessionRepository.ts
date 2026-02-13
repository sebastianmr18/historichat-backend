// src/infrastructure/database/InMemorySessionRepository.ts

import { ISessionRepository } from '../../domain/agent/repositories/ISessionRepository.js';
import { Session } from '../../domain/agent/entities/Session.js';

export class InMemorySessionRepository implements ISessionRepository {
  private sessions: Map<string, Session> = new Map();

  async save(session: Session): Promise<void> {
    this.sessions.set(session.getId(), session);
  }

  async findById(id: string): Promise<Session | null> {
    return this.sessions.get(id) || null;
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async findAllActive(): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(s => s.getStatus() === 'connected' || s.getStatus() === 'connecting');
  }
}