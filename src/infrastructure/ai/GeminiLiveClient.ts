// src/infrastructure/ai/GeminiLiveClient.ts
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { HandleGeminiMessage } from '../../domain/agent/use-cases/HandleGeminiMessage.js';

export interface IGeminiLiveClient {
  connect(sessionId: string, systemInstruction: string): Promise<void>;
  sendAudio(sessionId: string, audioChunk: Buffer): Promise<void>;
  disconnect(sessionId: string): Promise<void>;
}

export class GeminiLiveClient implements IGeminiLiveClient {
  private sessions: Map<string, any> = new Map();

  constructor(
    private apiKey: string,
    private messageHandler: HandleGeminiMessage
  ) {}

  async connect(sessionId: string, systemInstruction: string): Promise<void> {
    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });

      console.log(`[GeminiLive] Conectando con modelo: gemini-2.5-flash-native-audio-preview-09-2025`);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore'
              }
            }
          },
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log(`[GeminiLive] ✅ Sesión ${sessionId} abierta (callback onopen)`);
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log(`[GeminiLive] 📨 Mensaje recibido de ${sessionId}:`, JSON.stringify(message).substring(0, 200));
            await this.handleGeminiMessage(sessionId, message);
          },
          onerror: (error: any) => {
            console.error(`[GeminiLive] ❌ Error en sesión ${sessionId}:`, error);
          },
          onclose: (closeEvent?: any) => {
            console.log(`[GeminiLive] 🔒 Sesión ${sessionId} cerrada. Código: ${closeEvent?.code}, Razón: ${closeEvent?.reason}`);
            this.sessions.delete(sessionId);
          }
        }
      });

      this.sessions.set(sessionId, sessionPromise);
      await sessionPromise;
      console.log(`[GeminiLive] ✅ Sesión ${sessionId} lista para usar`);

    } catch (error) {
      console.error(`[GeminiLive] ❌ Error conectando sesión ${sessionId}:`, error);
      this.sessions.delete(sessionId);
      throw error;
    }
  }

  async sendAudio(sessionId: string, audioChunk: Buffer): Promise<void> {
    const sessionPromise = this.sessions.get(sessionId);
    if (!sessionPromise) {
      throw new Error(`No active Gemini session for ${sessionId}`);
    }

    try {
      const session = await sessionPromise;
      if (!session) {
        throw new Error(`Session ${sessionId} is null`);
      }

      console.log(`[GeminiLive] Enviando audio a ${sessionId}, tamaño: ${audioChunk.length} bytes`);

      // Verificar que el chunk no esté vacío
      if (audioChunk.length === 0) {
        throw new Error('Audio chunk vacío');
      }

      // Enviar audio con tipo MIME explícito y en base64 (formato requerido por Gemini Live)
      await session.sendRealtimeInput({
        media: {
          data: audioChunk.toString('base64'),
          mimeType: 'audio/pcm;rate=16000'
        }
      });

      console.log(`[GeminiLive] ✅ Audio enviado correctamente a ${sessionId}`);

    } catch (error) {
      console.error(`[GeminiLive] Error enviando audio a sesión ${sessionId}:`, error);
      throw error;
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    const sessionPromise = this.sessions.get(sessionId);
    if (sessionPromise) {
      try {
        const session = await sessionPromise;
        if (session && session.close) {
          await session.close();
        }
      } catch (error) {
        console.error(`[GeminiLive] Error cerrando sesión ${sessionId}:`, error);
      } finally {
        this.sessions.delete(sessionId);
      }
    }
  }

  private async handleGeminiMessage(sessionId: string, message: LiveServerMessage): Promise<void> {
    try {
      console.log(`[GeminiLive] Procesando mensaje de ${sessionId}`);
      const domainMessage: any = {};

      if (message.serverContent?.interrupted) {
        domainMessage.type = 'interrupted';
        await this.messageHandler.execute(sessionId, domainMessage);
        return;
      }

      const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
      if (base64Audio) {
        console.log(`[GeminiLive] Recibido audio del modelo, tamaño base64: ${base64Audio.length}`);
        domainMessage.type = 'audio';
        domainMessage.data = { audio: base64Audio };
        await this.messageHandler.execute(sessionId, domainMessage);
      }

      if (message.serverContent?.inputTranscription) {
        console.log(`[GeminiLive] Transcripción usuario: ${message.serverContent.inputTranscription.text}`);
        domainMessage.type = 'transcription';
        domainMessage.data = { 
          role: 'user', 
          transcription: message.serverContent.inputTranscription.text 
        };
        await this.messageHandler.execute(sessionId, domainMessage);
      }

      if (message.serverContent?.outputTranscription) {
        console.log(`[GeminiLive] Transcripción modelo: ${message.serverContent.outputTranscription.text}`);
        domainMessage.type = 'transcription';
        domainMessage.data = { 
          role: 'model', 
          transcription: message.serverContent.outputTranscription.text 
        };
        await this.messageHandler.execute(sessionId, domainMessage);
      }

      if (message.serverContent?.turnComplete) {
        console.log(`[GeminiLive] Turno completo`);
        domainMessage.type = 'turnComplete';
        await this.messageHandler.execute(sessionId, domainMessage);
      }

    } catch (error) {
      console.error(`[GeminiLive] Error en handleGeminiMessage:`, error);
    }
  }
}