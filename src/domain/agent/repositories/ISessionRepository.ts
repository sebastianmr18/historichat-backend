// src/domain/agent/repositories/ISessionRepository.ts

import { Session } from '../entities/Session.js';

export interface ISessionRepository {
  save(session: Session): Promise<void>;
  findById(id: string): Promise<Session | null>;
  delete(id: string): Promise<void>;
  findAllActive(): Promise<Session[]>;
}