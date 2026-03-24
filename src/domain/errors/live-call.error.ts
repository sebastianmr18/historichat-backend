import type { LiveCallErrorCode } from '../live/live.types.js';

export class LiveCallError extends Error {
  constructor(
    public readonly code: LiveCallErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LiveCallError';
  }
}
