// src/domain/agent/entities/Session.ts

export type SessionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export class Session {
  private id: string;
  private status: SessionStatus;
  private createdAt: Date;
  private lastActivityAt: Date;
  private transcriptBuffer: { user: string; model: string };

  constructor(id: string) {
    this.id = id;
    this.status = 'disconnected';
    this.createdAt = new Date();
    this.lastActivityAt = new Date();
    this.transcriptBuffer = { user: '', model: '' };
  }

  public getId(): string { return this.id; }
  public getStatus(): SessionStatus { return this.status; }
  public getTranscriptBuffer() { return { ...this.transcriptBuffer }; }

  public markAsConnecting(): void { this.status = 'connecting'; this.updateActivity(); }
  public markAsConnected(): void { this.status = 'connected'; this.updateActivity(); }
  public markAsDisconnected(): void { this.status = 'disconnected'; this.updateActivity(); }
  public markAsError(): void { this.status = 'error'; this.updateActivity(); }

  public appendUserTranscript(text: string): void { this.transcriptBuffer.user += text; this.updateActivity(); }
  public appendModelTranscript(text: string): void { this.transcriptBuffer.model += text; this.updateActivity(); }
  public clearTranscriptBuffer(): { user: string; model: string } {
    const buffer = { ...this.transcriptBuffer };
    this.transcriptBuffer = { user: '', model: '' };
    return buffer;
  }
  private updateActivity(): void { this.lastActivityAt = new Date(); }
}