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

export interface DebateTurnCharacterResult {
  messageId: number;
  text: string;
  speakerId: string;
  speakerName: string;
  audioBase64?: string;
  warning?: DebateWarningPayload;
}

export interface DebateTurnResult {
  userMessageId: number;
  userText: string;
  responses: DebateTurnCharacterResult[];
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
  turnOrder: "A" | "B";
}

export interface DebateTurnPayload {
  conversationId: string;
  traceId: string;
  messageId: number;
  text: string;
  speakerId: string;
  speakerName: string;
  turnOrder: "A" | "B";
  audio?: string;
  warning?: DebateWarningPayload;
}

export interface DebateRoundCompletePayload {
  conversationId: string;
  traceId: string;
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
    turnOrder: "A" | "B";
  }): void;
  onTurnReady(payload: DebateTurnCharacterResult & { turnOrder: "A" | "B" }): void;
  onRoundCompleted(payload: { warnings?: DebateWarningPayload[] }): void;
}