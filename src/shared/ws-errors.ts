import { ChatFlowError } from "../domain/errors/chat-flow.error.js";

export interface ClientError {
  message: string;
  code: string;
  stage: string;
  retryable: boolean;
}

export function toClientError(error: unknown, fallbackMessage: string): ClientError {
  if (error instanceof ChatFlowError) {
    return {
      message: error.message,
      code: error.code,
      stage: error.stage,
      retryable: error.retryable,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
      code: "UNEXPECTED_ERROR",
      stage: "unknown",
      retryable: true,
    };
  }

  return {
    message: fallbackMessage,
    code: "UNEXPECTED_ERROR",
    stage: "unknown",
    retryable: true,
  };
}
