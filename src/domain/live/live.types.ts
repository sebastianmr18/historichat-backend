// ---------------------------------------------------------------------------
// Live Call – Domain types
// ---------------------------------------------------------------------------

/** Error codes emitted via `live:error`. */
export type LiveCallErrorCode =
  | 'CHARACTER_NOT_FOUND'
  | 'GEMINI_CONNECTION_FAILED'
  | 'GEMINI_SESSION_ERROR'
  | 'SESSION_LIMIT_REACHED'
  | 'AUTHENTICATION_FAILED'
  | 'RAG_QUERY_FAILED'
  | 'INTERNAL_ERROR';

// ---- Client → Server payloads ----

export interface LiveStartPayload {
  characterId: string;
  systemInstruction: string;
}

export interface LiveMutePayload {
  muted: boolean;
}

// ---- Server → Client payloads ----

export interface LiveReadyPayload {
  sessionId: string;
  voiceName: string;
  characterName: string;
}

export interface LiveAudioPayload {
  audio: string; // base64-encoded PCM16, mono, 24 kHz
}

export interface LiveTranscriptionPayload {
  role: 'user' | 'model';
  text: string;
  isFinal: boolean;
}

export interface LiveErrorPayload {
  code: LiveCallErrorCode;
  message: string;
  retryable: boolean;
}

export interface LiveEndedPayload {
  reason: 'user_request' | 'gemini_closed' | 'timeout' | 'error';
  durationMs: number;
}

export interface LiveSearchingPayload {
  isSearching: boolean;
}

// ---- Internal session state ----

export interface TranscriptBuffer {
  user: string;
  model: string;
}

export interface TranscriptEntry {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface LiveSessionState {
  socketId: string;
  userId: string;
  characterId: string;
  characterVectorDbName: string;
  geminiSession: import('@google/genai').Session | null;
  startedAt: number;
  lastActivityAt: number;
  transcriptBuffer: TranscriptBuffer;
  transcriptHistory: TranscriptEntry[];
  inactivityTimer: ReturnType<typeof setTimeout> | null;
}

// ---- Emission callback interface (decouples service from Socket.IO) ----

export interface LiveSessionEmitter {
  emitReady: (payload: LiveReadyPayload) => void;
  emitAudio: (payload: LiveAudioPayload) => void;
  emitTranscription: (payload: LiveTranscriptionPayload) => void;
  emitInterrupted: () => void;
  emitError: (payload: LiveErrorPayload) => void;
  emitEnded: (payload: LiveEndedPayload) => void;
  emitSearching: (payload: LiveSearchingPayload) => void;
}
