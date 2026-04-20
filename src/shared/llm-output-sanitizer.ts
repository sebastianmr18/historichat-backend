export class InvalidAssistantOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAssistantOutputError";
  }
}

interface SanitizerOptions {
  allowJsonEnvelope?: boolean;
  rejectCodeLikeContent?: boolean;
}

const CODE_PATTERNS: RegExp[] = [
  /```[\s\S]*```/m,
  /^\s*(import|export|const|let|var|function|class)\b/m,
  /\b(return|await|console\.log|module\.exports)\b/,
  /\b(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/i,
  /<\/?(html|body|script|style)[^>]*>/i,
];

function tryParseJson(value: string): unknown | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function extractTextFromJsonEnvelope(parsed: unknown): string | undefined {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }

  if (typeof (parsed as Record<string, unknown>).text === "string") {
    return (parsed as Record<string, unknown>).text as string;
  }

  return undefined;
}

function stripSingleCodeFence(text: string): string {
  const match = text.trim().match(/^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n```$/);
  if (!match) {
    return text;
  }

  return match[1]?.trim() ?? "";
}

function isCodeLike(text: string): boolean {
  return CODE_PATTERNS.some((pattern) => pattern.test(text));
}

export function sanitizeAssistantOutput(rawText: string, options: SanitizerOptions = {}): string {
  let text = (rawText ?? "").trim();
  if (!text) {
    throw new InvalidAssistantOutputError("La respuesta del asistente esta vacia.");
  }

  const parsed = tryParseJson(text);
  if (parsed !== undefined) {
    if (!options.allowJsonEnvelope) {
      throw new InvalidAssistantOutputError("La respuesta del asistente llego en formato JSON no permitido.");
    }

    const extractedText = extractTextFromJsonEnvelope(parsed);
    if (!extractedText?.trim()) {
      throw new InvalidAssistantOutputError("La respuesta JSON no contiene un campo text valido.");
    }

    text = extractedText.trim();
  }

  text = stripSingleCodeFence(text);

  if (!text) {
    throw new InvalidAssistantOutputError("La respuesta del asistente quedo vacia tras sanitizar.");
  }

  if (options.rejectCodeLikeContent !== false && isCodeLike(text)) {
    throw new InvalidAssistantOutputError("La respuesta del asistente contiene contenido con formato de codigo.");
  }

  if (text.startsWith("{") || text.startsWith("[")) {
    throw new InvalidAssistantOutputError("La respuesta del asistente mantiene formato estructurado no permitido.");
  }

  return text;
}