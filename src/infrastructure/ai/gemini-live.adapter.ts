import { GoogleGenAI, Modality, Type, Session, FunctionCall } from '@google/genai';
import type { LiveServerMessage } from '@google/genai';
import { env } from '../../config/env.js';
import { logger } from '../logging/logger.js';

export interface GeminiLiveCallbacks {
  onReady: () => void;
  onAudio: (base64Audio: string) => void;
  onInputTranscription: (text: string) => void;
  onOutputTranscription: (text: string) => void;
  onTurnComplete: () => void;
  onInterrupted: () => void;
  onToolCall: (functionCalls: FunctionCall[]) => void;
  onError: (error: Error) => void;
  onClose: (reason: string) => void;
}

export interface GeminiLiveConnectParams {
  voiceName: string;
  systemInstruction: string;
  callbacks: GeminiLiveCallbacks;
}

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

export class GeminiLiveAdapter {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

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

  sendAudio(session: Session, base64Audio: string): void {
    session.sendRealtimeInput({
      media: {
        data: base64Audio,
        mimeType: 'audio/pcm;rate=16000',
      },
    });
  }

  sendToolResponse(
    session: Session,
    functionResponses: Array<{ id: string; name: string; response: Record<string, unknown> }>,
  ): void {
    session.sendToolResponse({ functionResponses });
  }

  closeSession(session: Session): void {
    try {
      session.close();
    } catch (error) {
      logger.warn('[gemini-live.adapter] closeSession error (ignored)', { error });
    }
  }

  private routeMessage(message: LiveServerMessage, callbacks: GeminiLiveCallbacks): void {
    const content = message.serverContent;

    // 1. Interruptions
    if (content?.interrupted) {
      callbacks.onInterrupted();
      return;
    }

    // 2. Tool calls (RAG)
    if (message.toolCall?.functionCalls?.length) {
      callbacks.onToolCall(message.toolCall.functionCalls);
      return;
    }

    // 3. Audio data — iterate all parts, not just parts[0]
    const parts = content?.modelTurn?.parts;
    if (parts?.length) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          callbacks.onAudio(part.inlineData.data);
        }
      }
    }

    // 4. Transcriptions
    if (content?.inputTranscription?.text) {
      callbacks.onInputTranscription(content.inputTranscription.text);
    }
    if (content?.outputTranscription?.text) {
      callbacks.onOutputTranscription(content.outputTranscription.text);
    }

    // 5. Turn complete
    if (content?.turnComplete) {
      callbacks.onTurnComplete();
    }
  }
}
