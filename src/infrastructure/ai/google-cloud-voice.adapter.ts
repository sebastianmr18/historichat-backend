import speech from '@google-cloud/speech';
import textToSpeech from '@google-cloud/text-to-speech';
import { ITextToSpeech, ISpeechToText } from '../../shared/types.js';
import { logger } from '../logging/logger.js';

/**
 * Adaptador de infraestructura para Google Cloud Voice Services.
 * Requiere que GOOGLE_APPLICATION_CREDENTIALS esté configurado en el entorno.
 */
export class GoogleCloudVoiceAdapter implements ITextToSpeech, ISpeechToText {
  private ttsClient: textToSpeech.TextToSpeechClient;
  private sttClient: speech.SpeechClient;

  constructor() {
    this.ttsClient = new textToSpeech.TextToSpeechClient();
    this.sttClient = new speech.SpeechClient();
  }

  /**
   * Genera audio a partir de texto.
   * @param text Texto a sintetizar.
   * @param voiceName Nombre de la voz de Google Cloud (ej. "es-ES-Neural2-B").
   * @returns Buffer con el contenido de audio en formato MP3.
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
   * Transcribe un buffer de audio a texto eliminando el I/O en disco.
   * @param audioBuffer Buffer del audio.
   * @param encoding Formato del audio (ej. 'WEBM_OPUS', 'MP3').
   * @returns Cadena de texto transcrita.
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