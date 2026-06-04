/**
 * @file gemini-live.adapter.ts
 * @description Adaptador de infraestructura para interactuar con la API en tiempo real de Gemini.
 * Ofrece soporte para la transmision bidireccional de audio, control de interrupciones, transcripcion automatica,
 * y llamadas a herramientas para busqueda de conocimiento RAG.
 */

import { GoogleGenAI, Modality, Type, Session, FunctionCall } from '@google/genai';
import type { LiveServerMessage } from '@google/genai';
import { env } from '../../config/env.js';
import { logger } from '../logging/logger.js';

/**
 * Callbacks para los eventos disparados por la conexion de WebSocket con Gemini.
 */
export interface GeminiLiveCallbacks {
  /** Invocado cuando la conexion se ha abierto correctamente. */
  onReady: () => void;
  /** Invocado cuando se recibe un fragmento de audio en Base64 desde el modelo. */
  onAudio: (base64Audio: string) => void;
  /** Invocado cuando se recibe transcripcion del audio de entrada del usuario. */
  onInputTranscription: (text: string) => void;
  /** Invocado cuando se recibe transcripcion del audio generado por el modelo. */
  onOutputTranscription: (text: string) => void;
  /** Invocado cuando el modelo ha terminado de responder el turno actual. */
  onTurnComplete: () => void;
  /** Invocado cuando el usuario interrumpe al modelo mientras responde. */
  onInterrupted: () => void;
  /** Invocado cuando el modelo solicita la ejecucion de una herramienta (RAG). */
  onToolCall: (functionCalls: FunctionCall[]) => void;
  /** Invocado cuando ocurre un error en la conexion o el canal. */
  onError: (error: Error) => void;
  /** Invocado al cerrarse la sesion. */
  onClose: (reason: string) => void;
}

/**
 * Parametros necesarios para establecer la conexion con Gemini en tiempo real.
 */
export interface GeminiLiveConnectParams {
  /** Nombre de la voz preconstruida a utilizar (ej. "Kore", "Puck"). */
  voiceName: string;
  /** Instrucciones de sistema de la identidad del personaje. */
  systemInstruction: string;
  /** Lista de callbacks para manejar el flujo de transmision. */
  callbacks: GeminiLiveCallbacks;
}

/**
 * Declaracion de la herramienta consultar_base_conocimientos expuesta al modelo.
 */
const RAG_TOOL_DECLARATION = {
  functionDeclarations: [
    {
      name: 'consultar_base_conocimientos',
      description:
        'Consulta la base de conocimientos del personaje para obtener informacion relevante',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: 'La pregunta o tema sobre el cual buscar informacion',
          },
        },
        required: ['query'],
      },
    },
  ],
};

/**
 * Adaptador de bajo nivel para establecer y controlar la sesion bidireccional
 * de transmision en tiempo real con los modelos Gemini Live.
 */
export class GeminiLiveAdapter {
  /** Instancia cliente de GoogleGenAI SDK. */
  private ai: GoogleGenAI;

  /**
   * Crea una instancia de GeminiLiveAdapter.
   */
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  /**
   * Establece una nueva sesion en tiempo real (WebSocket) con la API de Gemini.
   *
   * @param params - Parametros de conexion.
   * @returns La sesion de conexion WebSocket devuelta por el SDK.
   */
  async connect(params: GeminiLiveConnectParams): Promise<Session> {
    const { voiceName, systemInstruction, callbacks } = params;

    const session = await this.ai.live.connect({
      model: env.GEMINI_LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
        systemInstruction,
        tools: [RAG_TOOL_DECLARATION],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {
          logger.debug('[gemini-live.adapter] connection opened');
          callbacks.onReady();
        },
        onmessage: (message: LiveServerMessage) => {
          try {
            this.routeMessage(message, callbacks);
          } catch (error) {
            logger.error('[gemini-live.adapter] onmessage handler error', { error });
          }
        },
        onerror: (e: ErrorEvent) => {
          logger.error('[gemini-live.adapter] connection error', { message: e?.message });
          callbacks.onError(new Error(e?.message ?? 'Gemini Live connection error'));
        },
        onclose: (_e: CloseEvent) => {
          logger.info('[gemini-live.adapter] connection closed');
          callbacks.onClose('gemini_closed');
        },
      },
    });

    return session;
  }

  /**
   * Envia un fragmento de audio en PCM 16kHz codificado en Base64 hacia el modelo.
   *
   * @param session - Sesion activa.
   * @param base64Audio - Datos de audio codificados en Base64.
   */
  sendAudio(session: Session, base64Audio: string): void {
    session.sendRealtimeInput({
      media: {
        data: base64Audio,
        mimeType: 'audio/pcm;rate=16000',
      },
    });
  }

  /**
   * Retorna al modelo el resultado de la busqueda de la herramienta consultada (RAG).
   *
   * @param session - Sesion activa.
   * @param functionResponses - Lista con el ID de la llamada y la respuesta.
   */
  sendToolResponse(
    session: Session,
    functionResponses: Array<{ id: string; name: string; response: Record<string, unknown> }>,
  ): void {
    session.sendToolResponse({ functionResponses });
  }

  /**
   * Cierra de forma segura la sesion actual del WebSocket con Gemini.
   *
   * @param session - Sesion activa a cerrar.
   */
  closeSession(session: Session): void {
    try {
      session.close();
    } catch (error) {
      logger.warn('[gemini-live.adapter] closeSession error (ignored)', { error });
    }
  }

  /**
   * Rutea de forma interna los diferentes payloads de los mensajes WebSocket del servidor
   * hacia sus respectivos callbacks registrados.
   *
   * @param message - Mensaje sin procesar recibido del servidor de Gemini.
   * @param callbacks - Callbacks de sesion activos.
   */
  private routeMessage(message: LiveServerMessage, callbacks: GeminiLiveCallbacks): void {
    const content = message.serverContent;

    // 1. Interrupciones de usuario
    if (content?.interrupted) {
      callbacks.onInterrupted();
      return;
    }

    // 2. Ejecucion de Herramientas (RAG)
    if (message.toolCall?.functionCalls?.length) {
      callbacks.onToolCall(message.toolCall.functionCalls);
      return;
    }

    // 3. Audio - Iterar todas las partes
    const parts = content?.modelTurn?.parts;
    if (parts?.length) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          callbacks.onAudio(part.inlineData.data);
        }
      }
    }

    // 4. Transcripciones
    if (content?.inputTranscription?.text) {
      callbacks.onInputTranscription(content.inputTranscription.text);
    }
    if (content?.outputTranscription?.text) {
      callbacks.onOutputTranscription(content.outputTranscription.text);
    }

    // 5. Turno de respuesta completado
    if (content?.turnComplete) {
      callbacks.onTurnComplete();
    }
  }
}
