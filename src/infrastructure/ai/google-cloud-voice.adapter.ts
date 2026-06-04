/**
 * @file google-cloud-voice.adapter.ts
 * @description Adaptador de infraestructura para los servicios de voz de Google Cloud (Text-to-Speech y Speech-to-Text).
 * Requiere que la variable de entorno GOOGLE_APPLICATION_CREDENTIALS este configurada con la ruta a las credenciales de GCP.
 */

import speech from '@google-cloud/speech';
import textToSpeech from '@google-cloud/text-to-speech';
import { ITextToSpeech, ISpeechToText } from '../../shared/types.js';
import { logger } from '../logging/logger.js';

/**
 * Adaptador que implementa ITextToSpeech e ISpeechToText utilizando la API de Google Cloud.
 */
export class GoogleCloudVoiceAdapter implements ITextToSpeech, ISpeechToText {
  /** Cliente del servicio Text-to-Speech de Google. */
  private ttsClient: textToSpeech.TextToSpeechClient;
  /** Cliente del servicio Speech-to-Text de Google. */
  private sttClient: speech.SpeechClient;

  /**
   * Crea una instancia de GoogleCloudVoiceAdapter e inicializa los clientes de la API de Google.
   */
  constructor() {
    this.ttsClient = new textToSpeech.TextToSpeechClient();
    this.sttClient = new speech.SpeechClient();
  }

  /**
   * Genera audio sintetizado a partir de texto utilizando Google Cloud TTS.
   *
   * @param text - Texto a sintetizar.
   * @param voiceName - Nombre de la voz de Google Cloud (ej. "es-ES-Neural2-B").
   * @returns Promesa que se resuelve con un Buffer conteniendo el audio en formato MP3.
   * @throws Error si falla la peticion o la respuesta viene sin contenido.
   */
  async synthesize(text: string, voiceName: string = 'es-ES-Neural2-B'): Promise<Buffer> {
    try {
      logger.debug('[gcp.voice.synthesize] started', {
        voiceName,
        textLength: text.length,
        languageCode: 'es-ES',
      });

      const [response] = await this.ttsClient.synthesizeSpeech({
        input: { text },
        voice: { languageCode: 'es-ES', name: voiceName },
        audioConfig: { audioEncoding: 'MP3' },
      });

      if (!response.audioContent) {
        throw new Error('Google Cloud no retornó contenido de audio.');
      }

      const audioBuffer = Buffer.from(response.audioContent);

      logger.debug('[gcp.voice.synthesize] completed', {
        voiceName,
        audioBytes: audioBuffer.length,
      });

      return audioBuffer;
    } catch (error) {
      logger.error('[gcp.voice.synthesize] failed', {
        voiceName,
        textLength: text.length,
        error: error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : { message: String(error) },
      });
      throw new Error(`Fallo en TTS de Google Cloud: ${(error as Error).message}`);
    }
  }

  /**
   * Transcribe un buffer de audio a texto plano utilizando la API de reconocimiento de voz Google Cloud STT.
   *
   * @param audioBuffer - Buffer binario con los datos del audio.
   * @param encoding - Formato de codificacion del audio recibido ('WEBM_OPUS', 'MP3' o 'LINEAR16').
   * @returns Promesa que se resuelve con la transcripcion de texto.
   * @throws Error si falla la transcripcion.
   */
  async transcribe(audioBuffer: Buffer, encoding: 'WEBM_OPUS' | 'MP3' | 'LINEAR16' = 'WEBM_OPUS'): Promise<string> {
    try {
      const sampleRateHertz = encoding === 'WEBM_OPUS' ? 48000 : 44100;

      logger.debug('[gcp.voice.transcribe] started', {
        encoding,
        audioBytes: audioBuffer.length,
        sampleRateHertz,
        languageCode: 'es-ES',
      });

      const [response] = await this.sttClient.recognize({
        config: {
          encoding: encoding,
          sampleRateHertz,
          languageCode: 'es-ES',
        },
        audio: {
          content: audioBuffer.toString('base64'),
        },
      });

      const transcription = response.results
        ?.map(result => result.alternatives?.[0]?.transcript)
        .join('\n');

      if (!transcription) {
        logger.warn('[gcp.voice.transcribe] empty_transcription', {
          encoding,
          audioBytes: audioBuffer.length,
        });
        return '';
      }

      logger.debug('[gcp.voice.transcribe] completed', {
        encoding,
        audioBytes: audioBuffer.length,
        transcriptionLength: transcription.length,
      });

      return transcription;
    } catch (error) {
      logger.error('[gcp.voice.transcribe] failed', {
        encoding,
        audioBytes: audioBuffer.length,
        error: error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : { message: String(error) },
      });
      throw new Error(`Fallo en STT de Google Cloud: ${(error as Error).message}`);
    }
  }
}