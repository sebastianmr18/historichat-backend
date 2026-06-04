/**
 * @file types.ts
 * @description Definición de tipos generales, interfaces de servicios y payloads de eventos para el sistema de chat y debate multi-bot.
 */

/**
 * Modos de conversación estándar soportados.
 */
export type ConversationMode = 'interview';

/**
 * Modos de conversación heredados admitidos por compatibilidad.
 */
export type LegacyConversationMode = 'chat' | 'interview';

/**
 * Modos de conversación configurables para los prompts del sistema.
 */
export type PromptMode = 'interview' | 'call' | 'debate';

/**
 * Contrato de servicio para la síntesis de voz (Text-to-Speech - TTS).
 */
export interface ITextToSpeech {
  /**
   * Convierte un texto en un flujo de audio binario.
   * 
   * @param text - Texto a vocalizar.
   * @param voiceName - Nombre o identificador único del perfil de voz.
   * @returns Promesa que resuelve a un búfer binario con el audio sintetizado.
   */
  synthesize(text: string, voiceName?: string): Promise<Buffer>;
}

/**
 * Contrato de servicio para el reconocimiento del habla (Speech-to-Text - STT).
 */
export interface ISpeechToText {
  /**
   * Transcribe un búfer de audio en una cadena de texto.
   * 
   * @param audioBuffer - Búfer de audio a transcribir.
   * @param encoding - Tipo de codificación de audio (WEBM_OPUS, MP3, LINEAR16).
   * @returns Promesa que resuelve a la transcripción en texto plano.
   */
  transcribe(audioBuffer: Buffer, encoding?: 'WEBM_OPUS' | 'MP3' | 'LINEAR16'): Promise<string>;
}

/**
 * Contrato de servicio para el almacenamiento de archivos (GCP o Supabase).
 */
export interface IStorageService {
  /**
   * Sube un archivo al almacenamiento en la nube de forma segura.
   * 
   * @param bucket - Nombre del contenedor o bucket de almacenamiento.
   * @param path - Ruta física de destino para el archivo.
   * @param file - Búfer binario del archivo.
   * @param mimeType - Tipo MIME del archivo.
   * @returns Promesa que resuelve a la URL pública o identificador del archivo guardado.
   */
  uploadFile(bucket: string, path: string, file: Buffer, mimeType: string): Promise<string>;

  /**
   * Genera una URL firmada y temporal para el acceso seguro a un recurso privado.
   * 
   * @param bucket - Nombre del contenedor o bucket.
   * @param path - Ruta del archivo.
   * @param expiresInSeconds - Tiempo de expiración de la URL en segundos.
   * @returns Promesa que resuelve a la URL firmada temporal.
   */
  getSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string>;

  /**
   * Elimina un conjunto de archivos del almacenamiento.
   * 
   * @param bucket - Nombre del contenedor.
   * @param paths - Lista de rutas de los archivos a eliminar de forma permanente.
   */
  deleteFiles(bucket: string, paths: string[]): Promise<void>;
}

/**
 * Contexto de rastreo de solicitudes para flujos asíncronos y WebSockets.
 */
export interface RequestTraceContext {
  /**
   * Identificador único de la traza para correlacionar logs de una misma petición.
   */
  traceId?: string;
  /**
   * Identificador del socket WebSocket del cliente.
   */
  socketId?: string;
  /**
   * Nombre del evento WebSocket procesado.
   */
  event?: string;
}

/**
 * Parámetros de entrada para procesar un mensaje enviado mediante audio.
 */
export interface ProcessAudioMessageInput {
  /**
   * Identificador de la conversación activa.
   */
  conversationId: string;
  /**
   * Identificador del usuario que envía el mensaje.
   */
  userId: string;
  /**
   * Búfer binario que almacena el audio capturado.
   */
  audioBuffer: Buffer;
  /**
   * Tipo MIME de la grabación de audio.
   */
  mimeType: string;
  /**
   * Contexto opcional para rastreo de errores y logs.
   */
  trace?: RequestTraceContext;
  /**
   * Modo de conversación aplicado en la solicitud.
   */
  mode?: ConversationMode;
}

/**
 * Estructura de respuesta devuelta tras procesar un turno de chat.
 */
export interface ChatResponse {
  /**
   * Texto de respuesta generado por el bot.
   */
  text: string;
  /**
   * Identificador del mensaje persistido en la base de datos.
   */
  messageId?: number;
  /**
   * Identificador único del personaje que responde.
   */
  speakerId?: string;
  /**
   * Nombre del personaje que emite la respuesta.
   */
  speakerName?: string;
  /**
   * Audio sintetizado base64 para su reproducción inmediata en el cliente.
   */
  audioBase64?: string;
  /**
   * Sugerencias de seguimiento o continuaciones sugeridas para el usuario.
   */
  suggestions?: string[];
  /**
   * Advertencias operativas no críticas ocurridas durante el procesamiento (ej. fallo del TTS).
   */
  warning?: {
    code: string;
    message: string;
    stage: string;
    retryable: boolean;
  };
}

/**
 * Payload descriptivo para advertencias operativas en el flujo de debate.
 */
export interface DebateWarningPayload {
  /**
   * Código de la advertencia.
   */
  code: string;
  /**
   * Mensaje de descripción técnico.
   */
  message: string;
  /**
   * Etapa donde ocurrió la advertencia.
   */
  stage: string;
  /**
   * Indica si la etapa afectada es reintentable.
   */
  retryable: boolean;
}

/**
 * Orden u origen del turno en el debate multi-bot.
 */
export type DebateTurnOrder = "A" | "B" | "forced";

/**
 * Método de selección de orador implementado para deducir quién debe intervenir en el debate.
 */
export type DebateSpeakerSelectionMethod =
  | "explicit_forced"
  | "text_mention"
  | "fallback_next_speaker"
  | "manual_mode";

/**
 * Detalles de inferencia de orador generados durante el procesamiento del debate.
 */
export interface DebateSpeakerInferenceDetails {
  /**
   * Método empleado para seleccionar al orador.
   */
  method: DebateSpeakerSelectionMethod;
  /**
   * Identificador único del personaje seleccionado.
   */
  selectedSpeakerId: string;
  /**
   * Texto del diálogo que motivó la mención.
   */
  mentionText?: string;
  /**
   * Confianza de la deducción de orador (0 a 1).
   */
  confidence?: number;
}

/**
 * Motivos por los cuales un personaje puede saltar su intervención en el debate.
 */
export type DebateSkipReason =
  | "manual_user"
  | "auto_low_confidence"
  | "not_applicable"
  | "strategy"
  | "unknown";

/**
 * Payload enviado por el cliente para emitir una respuesta en texto dentro de un debate.
 */
export interface SendDebateTextPayload {
  /**
   * Identificador de la conversación.
   */
  conversationId: string;
  /**
   * Contenido del mensaje del usuario.
   */
  text: string;
  /**
   * Forzar explícitamente a un orador en el siguiente turno.
   */
  forced_speaker_id?: string | null;
}

/**
 * Payload enviado por el cliente para emitir una respuesta en audio base64 en un debate.
 */
export interface SendDebateAudioPayload {
  /**
   * Identificador de la conversación.
   */
  conversationId: string;
  /**
   * Flujo de audio codificado en base64.
   */
  audioBase64: string;
  /**
   * Tipo MIME del audio de entrada.
   */
  mimeType?: string;
  /**
   * Forzar explícitamente a un orador en el siguiente turno.
   */
  forced_speaker_id?: string | null;
}

/**
 * Payload para saltar el turno de un orador en un debate.
 */
export interface SkipDebateTurnPayload {
  /**
   * Identificador de la conversación.
   */
  conversationId: string;
  /**
   * Identificador del orador omitido.
   */
  speaker_id: string;
  /**
   * Justificación técnica u opcional del salto de turno.
   */
  reason?: string;
}

/**
 * Resultado individual de la intervención o salto de turno de un personaje en el debate.
 */
export interface DebateTurnCharacterResult {
  /**
   * Identificador del mensaje persistido.
   */
  messageId?: number;
  /**
   * Texto del diálogo generado por el personaje.
   */
  text?: string;
  /**
   * Identificador del personaje.
   */
  speakerId: string;
  /**
   * Nombre del personaje.
   */
  speakerName: string;
  /**
   * Indica si la intervención del personaje fue omitida (skip).
   */
  skipped?: boolean;
  /**
   * Motivo técnico del salto de turno.
   */
  skipReason?: DebateSkipReason;
  /**
   * Explicación detallada del salto del turno.
   */
  skipReasonDetail?: string;
  /**
   * Nivel de confianza de la respuesta o decisión de omisión.
   */
  confidence?: number;
  /**
   * Determina si la intervención fue forzada externamente.
   */
  isForced?: boolean;
  /**
   * Método utilizado para inferir si debía hablar o no.
   */
  inferenceMethod?: DebateSpeakerSelectionMethod;
  /**
   * Texto detectado en menciones.
   */
  detectedMentionText?: string;
  /**
   * Nivel de confianza en la detección de menciones.
   */
  mentionConfidence?: number;
  /**
   * Audio de respuesta codificado en base64.
   */
  audioBase64?: string;
  /**
   * Advertencias operativas.
   */
  warning?: DebateWarningPayload;
}

/**
 * Resultado completo consolidado de una ronda completa de debate multi-bot.
 */
export interface DebateTurnResult {
  /**
   * Identificador del mensaje original del usuario.
   */
  userMessageId: number;
  /**
   * Texto enviado por el usuario.
   */
  userText: string;
  /**
   * Lista de intervenciones individuales de los bots en esta ronda.
   */
  responses: DebateTurnCharacterResult[];
  /**
   * Cantidad total de respuestas activas generadas.
   */
  responsesCount: number;
  /**
   * Cantidad total de omisiones de turno decididas por los bots.
   */
  skipsCount: number;
  /**
   * Identificador del personaje seleccionado para tomar la palabra en el turno siguiente.
   */
  nextSpeakerId?: string;
  /**
   * Detalles sobre la inferencia de orador aplicada en esta ronda.
   */
  inferenceDetails?: DebateSpeakerInferenceDetails;
}

// --- Payloads granulares para los eventos de WebSocket del Debate ---

/**
 * Payload emitido para acusar recibo (ACK) del mensaje enviado por el usuario.
 */
export interface DebateUserAckPayload {
  conversationId: string;
  traceId: string;
  userMessageId: number;
  userText: string;
}

/**
 * Payload de evento que indica que un bot específico se encuentra escribiendo ("typing").
 */
export interface DebateTypingPayload {
  conversationId: string;
  traceId: string;
  speakerId: string;
  speakerName: string;
  turnOrder: DebateTurnOrder;
  isForced?: boolean;
}

/**
 * Payload de evento transmitido cuando un bot completa su intervención y emite su diálogo y audio.
 */
export interface DebateTurnPayload {
  conversationId: string;
  traceId: string;
  messageId: number;
  text: string;
  speakerId: string;
  speakerName: string;
  turnOrder: DebateTurnOrder;
  isForced?: boolean;
  inference_method?: DebateSpeakerSelectionMethod;
  detected_mention_text?: string;
  mention_confidence?: number;
  audio?: string;
  warning?: DebateWarningPayload;
}

/**
 * Payload de evento emitido cuando un bot decide omitir su turno de intervención en el debate.
 */
export interface DebateTurnSkippedPayload {
  conversationId: string;
  traceId: string;
  messageId: number;
  speakerId: string;
  speakerName: string;
  turnOrder: DebateTurnOrder;
  reason: DebateSkipReason;
  reasonDetail?: string;
  confidence?: number;
  isForced?: boolean;
  inference_method?: DebateSpeakerSelectionMethod;
  detected_mention_text?: string;
  mention_confidence?: number;
}

/**
 * Payload de evento transmitido cuando toda la ronda de debate ha concluido con éxito.
 */
export interface DebateRoundCompletePayload {
  conversationId: string;
  traceId: string;
  responsesCount: number;
  skipsCount: number;
  nextSpeakerId?: string;
  warnings?: DebateWarningPayload[];
  inference_method?: DebateSpeakerSelectionMethod;
  selected_speaker_id?: string;
  detected_mention_text?: string;
  mention_confidence?: number;
}

// --- Callbacks de progreso del motor de debate ---

/**
 * Colección de callbacks de progreso utilizados para interactuar y emitir actualizaciones operativas
 * en tiempo real durante la ejecución del caso de uso de debate.
 */
export interface DebateProgressCallbacks {
  /**
   * Ejecutado inmediatamente después de validar y guardar el mensaje del usuario.
   */
  onUserMessagePersisted(payload: {
    userMessageId: number;
    userText: string;
  }): void;

  /**
   * Invocado cuando un bot inicia la escritura/evaluación de su respuesta.
   */
  onTyping(payload: {
    speakerId: string;
    speakerName: string;
    turnOrder: DebateTurnOrder;
    isForced?: boolean;
  }): void;

  /**
   * Invocado cuando un bot genera exitosamente su diálogo e interviene activamente.
   */
  onTurnReady(payload: DebateTurnCharacterResult & { turnOrder: DebateTurnOrder }): void;

  /**
   * Invocado cuando un bot evalúa el contexto y decide no intervenir en la ronda.
   */
  onTurnSkipped(payload: {
    messageId: number;
    speakerId: string;
    speakerName: string;
    turnOrder: DebateTurnOrder;
    reason: DebateSkipReason;
    reasonDetail?: string;
    confidence?: number;
    isForced?: boolean;
    inferenceMethod?: DebateSpeakerSelectionMethod;
    detectedMentionText?: string;
    mentionConfidence?: number;
  }): void;

  /**
   * Invocado al completarse la totalidad de intervenciones programadas de la ronda.
   */
  onRoundCompleted(payload: {
    warnings?: DebateWarningPayload[];
    responsesCount: number;
    skipsCount: number;
    nextSpeakerId?: string;
    inferenceDetails?: DebateSpeakerInferenceDetails;
  }): void;

  /**
   * Callback opcional activado cuando se han calculado las sugerencias de diálogo para el siguiente turno.
   */
  onSuggestionsReady?(payload: {
    suggestions: string[];
  }): void;
}