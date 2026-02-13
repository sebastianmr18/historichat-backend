// src/application/services/LiveConversationService.ts
import { GeminiLiveAdapter } from "../../infrastructure/ai/gemini-live.adapter.js";
import { EventEmitter } from "events";

export class LiveConversationService extends EventEmitter {
  private adapter: GeminiLiveAdapter;
  private initialized = false;

  constructor() {
    super();
    this.adapter = new GeminiLiveAdapter();
  }

  public async initialize() {
    if (this.initialized) return;
    this.initialized = true;

    // Wire adapter events to our own events
    this.adapter.on("open", () => this.emit("open"));
    this.adapter.on("message", (msg: any) => this.handleMessage(msg));
    this.adapter.on("error", (e: any) => this.emit("error", e));
    this.adapter.on("close", (ev: any) => this.emit("close", ev));

    await this.adapter.connect();
  }

  public async handleClientAudio(buffer: Buffer) {
    // Forward exactly as serverless does
    try {
      await this.adapter.sendAudio(buffer);
    } catch (err) {
      this.emit("error", err);
    }
  }

  private handleMessage(msg: any) {
    // Forward the raw message as `serverMessage` and also split common parts
    this.emit("serverMessage", msg);

    // If serverContent has modelTurn parts with inline audio, forward them
    const sc = msg.serverContent;
    if (!sc) return;

    if (sc.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        if (part.inlineData?.mimeType?.startsWith("audio/pcm")) {
          // inlineData.data is base64 string — convert to Buffer and emit
          const b = Buffer.from(part.inlineData.data, "base64");
          this.emit("audio", b);
        }
        if (part.text) {
          this.emit("text", part.text);
        }
      }
    }

    // transcriptions and control events
    if (sc.inputTranscription) {
      this.emit("inputTranscription", sc.inputTranscription);
    }
    if (sc.outputTranscription) {
      this.emit("outputTranscription", sc.outputTranscription);
    }
    if (sc.interrupted) {
      this.emit("interrupted");
    }
    if (sc.turnComplete) {
      this.emit("turnComplete");
    }
  }

  public async close() {
    await this.adapter.close();
  }
}
