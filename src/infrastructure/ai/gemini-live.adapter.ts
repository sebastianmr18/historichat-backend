import { EventEmitter } from 'events';
import { GoogleGenAI, LiveCallbacks, Modality } from '@google/genai';
import { GEMINI_CONFIG } from '../../config/gemini-live.config.js';

export class GeminiLiveAdapter extends EventEmitter {
  private client: GoogleGenAI;
  private session: any;
  private isConnected = false;
  private isReady = false; // 🔴 CLAVE: setupComplete recibido

  constructor() {
    super();
    this.client = new GoogleGenAI({
      apiKey: GEMINI_CONFIG.apiKey,
    });
  }

  public async connect(): Promise<void> {
    if (this.isConnected) return;

    console.log("🔌 Intentando conectar a Gemini Live...");

    const callbacks: LiveCallbacks = {
      onopen: () => {
        console.log("✅ Conexión con Google establecida (Session Open)");
        this.isConnected = true;
        this.emit('open');
      },

      onclose: (event) => {
        console.log("❌ Conexión con Google cerrada. Detalles:", event);
        this.isConnected = false;
        this.isReady = false;
        this.emit('close');
      },

      onerror: (err) => {
        console.error("🔥 Error interno de Google:", err);
        this.emit('error', err);
      },

      onmessage: (msg) => {
        console.log(
          "📩 Raw Message received:",
          JSON.stringify(msg).substring(0, 100)
        );
        this.handleServerMessage(msg);
      },
    };

    try {
      this.session = await this.client.live.connect({
        model: GEMINI_CONFIG.liveModel,
        config: {
          generationConfig: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Puck" },
              },
            },
          },
          systemInstruction: {
            parts: [
              {
                text: "Actúa como un asistente de voz de alta velocidad. Responde siempre con audio.",
              },
            ],
          },
        },
        callbacks,
      });
    } catch (error) {
      console.error("💀 Fallo fatal al conectar:", error);
      this.isConnected = false;
      this.emit(
        'error',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private handleServerMessage(message: any): void {
    // 🔴 setupComplete → ahora SÍ podemos enviar audio
    if (message.setupComplete) {
      console.log("🟢 Gemini setup completo, listo para audio");
      this.isReady = true;
      return;
    }

    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        if (part.inlineData?.mimeType?.startsWith('audio/pcm')) {
          this.emit('audio', Buffer.from(part.inlineData.data, 'base64'));
        }
        if (part.text) {
          this.emit('text', part.text);
        }
      }
    }

    if (message.serverContent?.interrupted) {
      this.emit('interrupted');
    }
  }

  public async sendAudio(audioBuffer: Buffer): Promise<void> {
    // 🔴 CLAVE ABSOLUTA: no enviar antes de setupComplete
    if (!this.isConnected || !this.session || !this.isReady) {
      return;
    }

    try {
      await this.session.sendRealtimeInput({
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: audioBuffer.toString('base64'),
          },
        ],
      });

      // Latido silencioso
      process.stdout.write('.');
    } catch (error) {
      console.error("Error enviando audio:", error);
      this.emit('error', error as Error);
    }
  }

public async endTurn(): Promise<void> {
  if (!this.session || !this.isReady) return;

  try {
    console.log("📤 Enviando endOfTurn a Gemini");

    await this.session.sendRealtimeInput({
      endOfTurn: true,
    });
  } catch (err) {
    console.error("Error enviando endOfTurn:", err);
  }
}


  public disconnect(): void {
    if (this.session) {
      this.session.close();
      this.session = null;
    }

    this.isConnected = false;
    this.isReady = false;
    this.emit('close');
    this.removeAllListeners();
  }
}
