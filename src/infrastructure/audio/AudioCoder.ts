// src/infrastructure/audio/AudioCodec.ts

/**
 * Utilidades para manejo de audio en el backend.
 * Por ahora, solo passthrough, pero aquí se podrían hacer conversiones si es necesario.
 */
export class AudioCodec {
  /**
   * Convierte un Buffer de audio PCM (formato esperado por Gemini) a otro formato si es necesario.
   * Por ahora, asumimos que el frontend envía PCM Float32 a 16kHz mono.
   */
  static normalizeForGemini(audioChunk: Buffer): Buffer {
    // Gemini espera audio en formato específico. Según la doc, sendRealtimeInput acepta:
    // "The audio payload. Currently, supported audio types are: PCM audio bytes encoded as 16-bit linear PCM little-endian, 16kHz mono."
    // Asumimos que el frontend ya envía eso.
    return audioChunk;
  }

  /**
   * Si el frontend enviara en otro formato, aquí se haría la conversión.
   */
  static pcmToBlob(pcmData: Buffer): Blob {
    // En Node.js no hay Blob nativo, pero la SDK de Google acepta Buffer.
    // Este método podría retornar el mismo Buffer o un stream.
    return pcmData as any; // Truco: la SDK acepta Buffer como Blob
  }
}