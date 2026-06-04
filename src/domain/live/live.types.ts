/**
 * @file live.types.ts
 * @description Tipos de datos, payloads de comunicación y estados de sesión para llamadas en vivo (Live Call).
 * Define los contratos para la comunicación en tiempo real sobre WebSockets entre el cliente y el servidor,
 * así como la integración interna con Gemini Live.
 */

/**
 * Códigos de error emitidos mediante el evento de llamada en vivo `live:error`.
 */
export type LiveCallErrorCode =
  | 'CHARACTER_NOT_FOUND'
  | 'GEMINI_CONNECTION_FAILED'
  | 'GEMINI_SESSION_ERROR'
  | 'SESSION_LIMIT_REACHED'
  | 'AUTHENTICATION_FAILED'
  | 'RAG_QUERY_FAILED'
  | 'INTERNAL_ERROR';

// ---- Payloads del Cliente → Servidor ----

/**
 * Payload enviado por el cliente para iniciar una sesión de llamada en vivo.
 */
export interface LiveStartPayload {
  /**
   * Identificador único del personaje con el que se desea iniciar la llamada.
   */
  characterId: string;
  /**
   * Instrucciones de sistema personalizadas para condicionar el comportamiento y personalidad del bot.
   */
  systemInstruction: string;
}

/**
 * Payload enviado por el cliente para mutear o desmutear el micrófono.
 */
export interface LiveMutePayload {
  /**
   * Indica si el flujo de audio del cliente está silenciado.
   */
  muted: boolean;
}

// ---- Payloads del Servidor → Cliente ----

/**
 * Payload enviado al cliente cuando la sesión y la conexión con Gemini se han establecido con éxito.
 */
export interface LiveReadyPayload {
  /**
   * Identificador único generado para la sesión de llamada en vivo.
   */
  sessionId: string;
  /**
   * Nombre de la voz configurada y asignada al personaje.
   */
  voiceName: string;
  /**
   * Nombre público del personaje.
   */
  characterName: string;
}

/**
 * Payload que transporta fragmentos de audio bidireccionales.
 */
export interface LiveAudioPayload {
  /**
   * Fragmento de audio codificado en formato base64. El formato esperado es PCM16 (16-bit linear PCM), canal mono, frecuencia de muestreo de 24 kHz.
   */
  audio: string;
}

/**
 * Payload enviado al cliente con la transcripción en tiempo real de la llamada.
 */
export interface LiveTranscriptionPayload {
  /**
   * Rol de quien emitió el mensaje en la transcripción.
   */
  role: 'user' | 'model';
  /**
   * Contenido de texto transcrito del habla.
   */
  text: string;
  /**
   * Indica si el fragmento de transcripción es definitivo o parcial.
   */
  isFinal: boolean;
}

/**
 * Payload enviado al cliente cuando ocurre algún error operativo en la llamada.
 */
export interface LiveErrorPayload {
  /**
   * Código único representativo del tipo de error.
   */
  code: LiveCallErrorCode;
  /**
   * Descripción textual y amigable del error para propósitos de depuración.
   */
  message: string;
  /**
   * Indica si el cliente puede intentar reconectarse de manera automática.
   */
  retryable: boolean;
}

/**
 * Payload enviado al cliente cuando se da por finalizada la llamada en vivo.
 */
export interface LiveEndedPayload {
  /**
   * Motivo por el cual se cerró la sesión activa.
   */
  reason: 'user_request' | 'gemini_closed' | 'timeout' | 'error';
  /**
   * Duración total acumulada de la sesión en milisegundos.
   */
  durationMs: number;
}

/**
 * Payload que indica al cliente si se está realizando una búsqueda RAG.
 */
export interface LiveSearchingPayload {
  /**
   * Indica si hay una consulta RAG activa buscando en la base de conocimientos.
   */
  isSearching: boolean;
}

// ---- Estado interno de la sesión ----

/**
 * Búfer temporal utilizado para acumular fragmentos de texto antes de estructurarlos en el historial de conversación.
 */
export interface TranscriptBuffer {
  /**
   * Texto acumulado correspondiente al usuario.
   */
  user: string;
  /**
   * Texto acumulado correspondiente al modelo (personaje).
   */
  model: string;
}

/**
 * Representa una entrada consolidada e inmutable dentro de la transcripción histórica de la llamada.
 */
export interface TranscriptEntry {
  /**
   * Rol de quien emite el mensaje.
   */
  role: 'user' | 'model';
  /**
   * Texto completo consolidado.
   */
  text: string;
  /**
   * Marca de tiempo Unix en milisegundos en la que se registró la entrada.
   */
  timestamp: number;
}

/**
 * Estructura de datos que almacena el estado completo de una sesión activa de llamada en vivo.
 */
export interface LiveSessionState {
  /**
   * Identificador del socket WebSocket asignado al cliente.
   */
  socketId: string;
  /**
   * Identificador único del usuario autenticado en la llamada.
   */
  userId: string;
  /**
   * Identificador del personaje con el que se interactúa.
   */
  characterId: string;
  /**
   * Nombre de la colección en la base de datos vectorial Chroma asociada al personaje para consultas RAG.
   */
  characterVectorDbName: string;
  /**
   * Instancia de sesión activa del SDK de Gemini Live.
   */
  geminiSession: import('@google/genai').Session | null;
  /**
   * Marca de tiempo Unix del inicio de la sesión.
   */
  startedAt: number;
  /**
   * Marca de tiempo Unix de la última interacción o actividad de audio detectada.
   */
  lastActivityAt: number;
  /**
   * Búfer de transcripción activo para acumular el turno actual.
   */
  transcriptBuffer: TranscriptBuffer;
  /**
   * Historial cronológico de todos los diálogos consolidados durante la llamada en vivo.
   */
  transcriptHistory: TranscriptEntry[];
  /**
   * Temporizador activo encargado de finalizar la llamada automáticamente tras un periodo prolongado de inactividad.
   */
  inactivityTimer: ReturnType<typeof setTimeout> | null;
}

// ---- Interfaz callback para el desacoplamiento del servicio y Socket.IO ----

/**
 * Interfaz que abstrae la emisión de eventos de socket hacia el cliente.
 * Desacopla la lógica de negocio de la sesión en vivo (servicios) de la implementación de transporte WebSockets (Socket.IO).
 */
export interface LiveSessionEmitter {
  /**
   * Notifica que la sesión está lista para operar.
   */
  emitReady: (payload: LiveReadyPayload) => void;
  /**
   * Envía fragmentos de audio de respuesta del modelo al cliente.
   */
  emitAudio: (payload: LiveAudioPayload) => void;
  /**
   * Envía fragmentos de transcripción en tiempo real.
   */
  emitTranscription: (payload: LiveTranscriptionPayload) => void;
  /**
   * Notifica que la reproducción de audio del modelo ha sido interrumpida por voz del usuario.
   */
  emitInterrupted: () => void;
  /**
   * Envía información de errores operativos críticos ocurridos en la sesión.
   */
  emitError: (payload: LiveErrorPayload) => void;
  /**
   * Notifica al cliente la finalización formal de la sesión.
   */
  emitEnded: (payload: LiveEndedPayload) => void;
  /**
   * Notifica si la sesión se encuentra buscando información en la base de conocimientos (RAG).
   */
  emitSearching: (payload: LiveSearchingPayload) => void;
}
