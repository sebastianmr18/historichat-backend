/**
 * @file mime-utils.ts
 * @description Utilidades de análisis y mapeo para tipos MIME de audio, resolviendo codificaciones y extensiones de archivo compatibles.
 */

/**
 * Obtiene la codificación de audio esperada por el motor de transcripción (STT) a partir del tipo MIME provisto.
 * 
 * @param mimeType - Tipo MIME del archivo o transmisión de audio (ej. "audio/webm", "audio/mp3").
 * @returns La codificación correspondiente compatible con las APIs de voz ("WEBM_OPUS", "MP3", o "LINEAR16" como fallback).
 */
export function getEncodingFromMimeType(mimeType: string): "WEBM_OPUS" | "MP3" | "LINEAR16" {
  if (mimeType.includes("webm")) return "WEBM_OPUS";
  if (mimeType.includes("mp3") || mimeType.includes("mpeg")) return "MP3";
  return "LINEAR16";
}

/**
 * Resuelve la extensión de archivo física correspondiente a partir de un tipo MIME de audio.
 * 
 * @param mimeType - Tipo MIME a evaluar.
 * @returns La extensión del archivo ("webm", "mp3", "wav" o "bin" como valor por defecto).
 */
export function getFileExtensionFromMimeType(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp3") || mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "bin";
}
