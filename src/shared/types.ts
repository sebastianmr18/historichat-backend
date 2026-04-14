export type ConversationMode = 'interview';
export type LegacyConversationMode = 'chat' | 'interview';
export type PromptMode = 'interview' | 'call' | 'debate';

export interface ITextToSpeech {
  synthesize(text: string, voiceName?: string): Promise<Buffer>;
}

export interface ISpeechToText {
  transcribe(audioBuffer: Buffer, encoding?: 'WEBM_OPUS' | 'MP3' | 'LINEAR16'): Promise<string>;
}

export interface IStorageService {
  uploadFile(bucket: string, path: string, file: Buffer, mimeType: string): Promise<string>;
  getSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string>;
  deleteFiles(bucket: string, paths: string[]): Promise<void>;
}

export interface RequestTraceContext {
  traceId?: string;
  socketId?: string;
  event?: string;
}

export interface ProcessAudioMessageInput {
  conversationId: string;
  userId: string;
  audioBuffer: Buffer;
  mimeType: string;
  trace?: RequestTraceContext;
  mode?: ConversationMode;
}

export interface ChatResponse {
  text: string;
  messageId?: number;
  speakerId?: string;
  speakerName?: string;
  audioBase64?: string;
  suggestions?: string[];
  warning?: {
    code: string;
    message: string;
    stage: string;
    retryable: boolean;
  };
}

export interface DebateWarningPayload {
  code: string;
  message: string;
  stage: string;
  retryable: boolean;
}

export type DebateTurnOrder = "A" | "B" | "forced";

export type DebateSkipReason =
  | "manual_user"
  | "auto_low_confidence"
  | "not_applicable"
  | "strategy"
  | "unknown";

export interface SendDebateTextPayload {
  conversationId: string;
  text: string;
  forced_speaker_id?: string | null;
}

export interface SkipDebateTurnPayload {
  conversationId: string;
  speaker_id: string;
  reason?: string;
}

export interface DebateTurnCharacterResult {
  messageId?: number;
  text?: string;
  speakerId: string;
  speakerName: string;
  skipped?: boolean;
  skipReason?: DebateSkipReason;
  skipReasonDetail?: string;
  confidence?: number;
  isForced?: boolean;
  audioBase64?: string;
  warning?: DebateWarningPayload;
}

export interface DebateTurnResult {
  userMessageId: number;
  userText: string;
  responses: DebateTurnCharacterResult[];
  responsesCount: number;
  skipsCount: number;
  nextSpeakerId?: string;
}

// --- Granular debate event payloads ---

export interface DebateUserAckPayload {
  conversationId: string;
  traceId: string;
  userMessageId: number;
  userText: string;
}

export interface DebateTypingPayload {
  conversationId: string;
  traceId: string;
  speakerId: string;
  speakerName: string;
  turnOrder: DebateTurnOrder;
  isForced?: boolean;
}

export interface DebateTurnPayload {
  conversationId: string;
  traceId: string;
  messageId: number;
  text: string;
  speakerId: string;
  speakerName: string;
  turnOrder: DebateTurnOrder;
  isForced?: boolean;
  audio?: string;
  warning?: DebateWarningPayload;
}

export interface DebateTurnSkippedPayload {
  conversationId: string;
  traceId: string;
  speakerId: string;
  speakerName: string;
  turnOrder: DebateTurnOrder;
  reason: DebateSkipReason;
  reasonDetail?: string;
  confidence?: number;
  isForced?: boolean;
}

export interface DebateRoundCompletePayload {
  conversationId: string;
  traceId: string;
  responsesCount: number;
  skipsCount: number;
  nextSpeakerId?: string;
  warnings?: DebateWarningPayload[];
}

/** Legacy payload — kept for backward compatibility during migration */
export interface DebateTurnResultPayload {
  conversationId: string;
  traceId: string;
  user_message_id: number;
  user_text: string;
  responses: Array<{
    message_id: number;
    text: string;
    speaker_id: string;
    speaker_name: string;
    audio?: string;
    warning?: DebateWarningPayload;
  }>;
}

// --- Debate progress callbacks ---

export interface DebateProgressCallbacks {
  onUserMessagePersisted(payload: {
    userMessageId: number;
    userText: string;
  }): void;
  onTyping(payload: {
    speakerId: string;
    speakerName: string;
    turnOrder: DebateTurnOrder;
    isForced?: boolean;
  }): void;
  onTurnReady(payload: DebateTurnCharacterResult & { turnOrder: DebateTurnOrder }): void;
  onTurnSkipped(payload: {
    speakerId: string;
    speakerName: string;
    turnOrder: DebateTurnOrder;
    reason: DebateSkipReason;
    reasonDetail?: string;
    confidence?: number;
    isForced?: boolean;
  }): void;
  onRoundCompleted(payload: {
    warnings?: DebateWarningPayload[];
    responsesCount: number;
    skipsCount: number;
    nextSpeakerId?: string;
  }): void;
}