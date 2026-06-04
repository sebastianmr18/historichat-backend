/**
 * @file llm-provider.interface.ts
 * @description Definicion de interfaces y errores comunes de proveedores LLM.
 * Modela los mensajes de historial, la respuesta generada, el contrato del proveedor (LlmProvider)
 * y la estructura de errores especificos (LlmProviderError).
 */

/**
 * Representacion simplificada de un mensaje en el historial de conversacion enviado al LLM.
 */
export interface LlmHistoryMessage {
  /** Rol del emisor del mensaje (generalmente "user" o "model"/"assistant"). */
  role: string;
  /** Contenido de texto del mensaje. */
  content: string;
}

/**
 * Estructura de salida devuelta por cualquier proveedor de LLM tras generar una respuesta.
 */
export interface LlmGenerateResponse {
  /** Texto plano generado por el modelo. */
  text: string;
  /** Objeto deserializado si se solicito respuesta estructurada JSON (opcional). */
  structuredOutput?: unknown;
  /** Nombre del proveedor de IA que proceso la solicitud (ej. "gemini", "groq"). */
  provider: string;
  /** Nombre especifico del modelo utilizado (ej. "gemini-1.5-flash"). */
  model: string;
}

/**
 * Interfaz que define el contrato obligatorio para integrar cualquier proveedor de LLM en el backend.
 */
export interface LlmProvider {
  /** Nombre identificador del proveedor. */
  readonly providerName: string;
  /** Nombre identificador del modelo configurado. */
  readonly modelName: string;

  /**
   * Genera una respuesta a partir de instrucciones de sistema, historial de chat y contexto opcional.
   *
   * @param systemPrompt - Instrucciones de comportamiento del sistema.
   * @param history - Historial previo de la conversacion.
   * @param userQuery - Mensaje actual enviado por el usuario.
   * @param contextRAG - Informacion de contexto recuperada mediante RAG (opcional).
   * @param responseSchema - Esquema de validacion (Zod/JSON Schema) para salida estructurada (opcional).
   * @returns Promesa con los datos de la respuesta generada.
   * @throws LlmProviderError si ocurre un error durante el procesamiento o la llamada de red.
   */
  generateResponse(
    systemPrompt: string,
    history: LlmHistoryMessage[],
    userQuery: string,
    contextRAG?: string,
    responseSchema?: unknown
  ): Promise<LlmGenerateResponse>;
}

/**
 * Opciones adicionales para inicializar un LlmProviderError.
 */
interface LlmProviderErrorOptions {
  /** Codigo de estado HTTP devuelto por la API externa (opcional). */
  statusCode?: number;
  /** Indica si la solicitud puede reintentarse de forma segura. */
  retryable?: boolean;
  /** Causa original u objeto del error subyacente. */
  cause?: unknown;
}

/**
 * Clase de excepcion especifica para errores surgidos durante la ejecucion de consultas a proveedores LLM.
 */
export class LlmProviderError extends Error {
  /** Nombre del proveedor que provoco el error. */
  public readonly provider: string;
  /** Nombre del modelo involucrado en la solicitud. */
  public readonly model: string;
  /** Codigo de estado HTTP del error (si corresponde). */
  public readonly statusCode?: number;
  /** Indica si el error es temporal (ej. limite de tasa superado, error de red) y amerita reintento. */
  public readonly retryable: boolean;
  /** Causa original del error subyacente. */
  public override readonly cause?: unknown;

  /**
   * Crea una instancia de LlmProviderError.
   *
   * @param provider - Nombre del proveedor.
   * @param model - Nombre del modelo.
   * @param message - Mensaje descriptivo de error.
   * @param options - Opciones de inicializacion del error (opcional).
   */
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