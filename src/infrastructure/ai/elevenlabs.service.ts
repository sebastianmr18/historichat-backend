import { ElevenLabsClient } from "elevenlabs";
import { env } from "../../config/env.js";
import { Readable } from "stream";

export class ElevenLabsService {
  private client: ElevenLabsClient;

  constructor() {
    this.client = new ElevenLabsClient({
      apiKey: env.ELEVENLABS_API_KEY,
    });
  }

  /**
   * Reemplaza a tts_elevenlabs.py
   */
  async textToSpeech(text: string, voiceId: string = "y68ZZ8pZ68CAS6iOCIDB"): Promise<Buffer> {
    try {
      const audioStream = await this.client.textToSpeech.convert(voiceId, {
        text,
        model_id: "eleven_multilingual_v2",
        output_format: "mp3_44100_128",
      });

      // Convertir el stream de ElevenLabs a un Buffer de Node.js
      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (error) {
      console.error("❌ Error en ElevenLabs TTS:", error);
      throw new Error("No se pudo generar el audio.");
    }
  }

  /**
   * Reemplaza a stt_elevenlabs.py
   * Recibe un Buffer (webm/mp3) y devuelve el texto transcrito.
   */
  async speechToText(audioBuffer: Buffer): Promise<string> {
    try {
      // ElevenLabs SDK para STT requiere un stream o un archivo
      const stream = Readable.from(audioBuffer);
      
      const response = await this.client.speechToText.convert({
        file: stream,
        model_id: "scribe_v1",
        language_code: "es",
      });

      return response.text;
    } catch (error) {
      console.error("❌ Error en ElevenLabs STT:", error);
      throw new Error("No se pudo transcribir el audio.");
    }
  }
}