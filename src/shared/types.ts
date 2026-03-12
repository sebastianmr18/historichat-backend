export type LiveAdapterEvents = {
  open: () => void
  setupcomplete: () => void
  audio: (buffer: Buffer) => void
  text: (text: string) => void
  interrupted: () => void
  error: (err: Error) => void
  turncomplete: () => void
}

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
}

export type MessageSchemaVersion = "v1_plain" | "v2_blocks";

export interface MessageTextBlock {
  id?: string;
  type: "text";
  content: string;
}

export interface InfoCardItem {
  label: string;
  value: string;
}

export interface InfoCardProps {
  title: string;
  description?: string;
  items?: InfoCardItem[];
}

export interface MessageComponentBlock {
  id?: string;
  type: "component";
  componentName: string;
  props: Record<string, unknown>;
}

export type MessageBlock = MessageTextBlock | MessageComponentBlock;

export interface ChatResponse {
  messageId?: number;
  text: string;
  audioBase64?: string;
  schemaVersion?: MessageSchemaVersion;
  blocks?: MessageBlock[];
  warning?: {
    code: string;
    message: string;
    stage: string;
    retryable: boolean;
  };
}