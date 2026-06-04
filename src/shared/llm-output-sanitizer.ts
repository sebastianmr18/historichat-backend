/**
 * @file llm-output-sanitizer.ts
 * @description Utilidades de sanitización y defensa para validar la respuesta generada por los modelos de lenguaje (LLM).
 * Protege contra fugas de prompts del sistema (prompt leakage), inyecciones de código, y envelopes JSON no deseados.
 */

/**
 * Error lanzado cuando la salida del asistente no supera las validaciones de seguridad o formato.
 */
export class InvalidAssistantOutputError extends Error {
  /**
   * Crea una instancia de InvalidAssistantOutputError.
   * 
   * @param message - Detalle específico del motivo del rechazo de la salida.
   */
  constructor(message: string) {
    super(message);
    this.name = "InvalidAssistantOutputError";
  }
}

/**
 * Opciones de configuración para el sanitizador de respuestas.
 */
interface SanitizerOptions {
  /**
   * Permite envoltorios JSON (por ejemplo, si el LLM devuelve un objeto con un campo `text`).
   */
  allowJsonEnvelope?: boolean;
  /**
   * Rechaza la respuesta si se detecta que parece código fuente o scripts inyectados.
   */
  rejectCodeLikeContent?: boolean;
}

/**
 * Patrones regex de código fuente para detectar scripts inyectados (JavaScript, HTML, SQL).
 */
const CODE_PATTERNS: RegExp[] = [
  /```[\s\S]*```/m,
  /^\s*(import|export|const|let|var|function|class)\b/m,
  /\b(return|await|console\.log|module\.exports)\b/,
  /\b(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/i,
  /<\/?(html|body|script|style)[^>]*>/i,
];

/**
 * Patrones para detectar fugas de instrucciones de sistema (system prompt leaks) o jailbreaks exitosos.
 */
const OUTPUT_LEAK_PATTERNS: RegExp[] = [
  /<system_identity>/i,
  /<behavior_rules>/i,
  /\bSYSTEM PROMPT\s*:/i,
  /\bINSTRUCCIONES DEL SISTEMA\s*:/i,
  /mis instrucciones (son|dicen|incluyen)/i,
  /my (system )?instructions (are|say|include)/i,
  /mi prompt de sistema/i,
  /DAN\s+mode\s+activated/i,
  /I\s+am\s+now\s+unrestricted/i,
  /ahora\s+(soy|estoy)\s+(libre|sin restricciones)/i,
  /jailbreak\s+(successful|complete|activated)/i,
];

/**
 * Escanea el texto en busca de filtraciones o confirmaciones de jailbreak.
 * 
 * @param text - Texto generado por el asistente a analizar.
 * @returns Un objeto que indica si hubo fuga y los patrones que coincidieron.
 */
export function detectOutputLeaks(text: string): { leaked: boolean; patterns: string[] } {
  const matched = OUTPUT_LEAK_PATTERNS
    .filter((p) => {
      p.lastIndex = 0;
      return p.test(text);
    })
    .map((p) => p.source);

  return { leaked: matched.length > 0, patterns: matched };
}

/**
 * Intenta parsear una cadena como objeto JSON.
 * 
 * @param value - Cadena a parsear.
 * @returns El objeto parseado o undefined si no es JSON válido.
 */
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

/**
 * Extrae el campo de texto interno de un envoltorio JSON si existe.
 * 
 * @param parsed - El objeto parseado.
 * @returns El texto extraído o undefined si no cumple con la estructura esperada.
 */
function extractTextFromJsonEnvelope(parsed: unknown): string | undefined {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }

  if (typeof (parsed as Record<string, unknown>).text === "string") {
    return (parsed as Record<string, unknown>).text as string;
  }

  return undefined;
}

/**
 * Remueve bloques de formato de código (code fences ```).
 * 
 * @param text - Texto con posibles bloques de código de markdown.
 * @returns Texto limpio sin los bloques de código externos.
 */
function stripSingleCodeFence(text: string): string {
  const match = text.trim().match(/^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n```$/);
  if (!match) {
    return text;
  }

  return match[1]?.trim() ?? "";
}

/**
 * Comprueba si el texto parece contener fragmentos de código fuente.
 * 
 * @param text - Texto a analizar.
 * @returns Verdadero si coincide con algún patrón de código inyectado.
 */
function isCodeLike(text: string): boolean {
  return CODE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Sanitiza y valida la salida textual del modelo de lenguaje, aplicando filtros de seguridad estrictos.
 * Procesa envolturas JSON y markdown fences, rechazando inyecciones y fugas del sistema.
 * 
 * @param rawText - Texto original entregado por el LLM.
 * @param options - Opciones de control (permitir JSON envelope o rechazar formato tipo código).
 * @returns Texto sanitizado y validado listo para su consumo o síntesis.
 * @throws {InvalidAssistantOutputError} Si la salida está vacía, contiene código, revela el prompt de sistema o es inválida.
 */
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

  const leakCheck = detectOutputLeaks(text);
  if (leakCheck.leaked) {
    throw new InvalidAssistantOutputError("La respuesta del asistente contiene contenido no permitido.");
  }

  return text;
}