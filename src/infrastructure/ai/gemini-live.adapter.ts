import { EventEmitter } from "events"
import { GoogleGenAI, LiveCallbacks, Modality } from "@google/genai"
import { GEMINI_CONFIG } from "../../config/gemini-live.config.js"
import { logger } from "../logging/logger.js"

export class GeminiLiveAdapter extends EventEmitter {
  private client: any;
  private session: any;
  private isReady = false;

  constructor() {
    super();
    this.client = new GoogleGenAI({ apiKey: GEMINI_CONFIG.apiKey });
  }

  public async connect() {
    if (this.session) return;

    const callbacks: LiveCallbacks = {
      onopen: () => {
        this.emit("open");
      },
      onmessage: (msg) => {
        this.emit("message", msg);
      },
      onerror: (err) => {
        this.emit("error", err);
      },
      onclose: (ev) => {
        this.emit("close", ev);
      },
    };

    try {



      this.session = await this.client.live.connect({
        model: GEMINI_CONFIG.liveModel,
        config: {
          generationConfig: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
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
        // map config fields to top-level to avoid deprecated generation_config usage
        //temperature: (GEMINI_CONFIG as any).temperature,
        //topP: (GEMINI_CONFIG as any).topP,
        //topK: (GEMINI_CONFIG as any).topK,
        //maxOutputTokens: (GEMINI_CONFIG as any).maxOutputTokens,
        //speechConfig: GEMINI_CONFIG.speechConfig,
        //systemInstruction: GEMINI_CONFIG.systemInstruction,
      })
      logger.info("connect() called on SDK")
    } catch (err) {
      logger.error("Failed to connect to Gemini", err)
      this.emit("error", err)
    }
  }

  public async sendAudio(buffer: Buffer) {
    if (!this.session) throw new Error("Session not ready");
    // Forward binary Blob/Buffer directly as media (matching serverless)
    await this.session.sendRealtimeInput({ media: buffer });
  }

  public async close() {
    try {
      this.session?.close();
    } catch (e) {}
    this.session = null;
  }
}
