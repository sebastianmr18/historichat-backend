export interface LlmHistoryMessage {
  role: string;
  content: string;
}

export interface LlmGenerateResponse {
  text: string;
  structuredOutput?: unknown;
  provider: string;
  model: string;
}

export interface LlmProvider {
  readonly providerName: string;
  readonly modelName: string;
  generateResponse(
    systemPrompt: string,
    history: LlmHistoryMessage[],
    userQuery: string,
    contextRAG?: string,
    responseSchema?: unknown
  ): Promise<LlmGenerateResponse>;
}

interface LlmProviderErrorOptions {
  statusCode?: number;
  retryable?: boolean;
  cause?: unknown;
}

export class LlmProviderError extends Error {
  public readonly provider: string;
  public readonly model: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public override readonly cause?: unknown;

  constructor(
    provider: string,
    model: string,
    message: string,
    options: LlmProviderErrorOptions = {}
  ) {
    super(message);
    this.name = "LlmProviderError";
    this.provider = provider;
    this.model = model;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? true;
    this.cause = options.cause;
  }
}