export type ChatFlowErrorCode =
  | "CONVERSATION_NOT_FOUND"
  | "STT_FAILED"
  | "NO_SPEECH"
  | "AUDIO_UPLOAD_FAILED"
  | "AI_RESPONSE_FAILED"
  | "TEXT_PROCESSING_FAILED"
  | "AUDIO_PROCESSING_FAILED"
  | "DEBATE_NOT_AVAILABLE"
  | "DEBATE_CHARACTER_NOT_FOUND"
  | "INVALID_DEBATE_CONFIGURATION";

export class ChatFlowError extends Error {
  constructor(
    public readonly code: ChatFlowErrorCode,
    message: string,
    public readonly stage: "validation" | "stt" | "upload" | "ai" | "persistence" | "tts" | "unknown",
    public readonly retryable: boolean,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ChatFlowError";
  }
}
