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

export interface DebateTurnCharacterResult {
  messageId: number;
  text: string;
  speakerId: string;
  speakerName: string;
  audioBase64?: string;
  warning?: ChatResponse["warning"];
}

export interface DebateTurnResult {
  userMessageId: number;
  userText: string;
  responses: DebateTurnCharacterResult[];
}