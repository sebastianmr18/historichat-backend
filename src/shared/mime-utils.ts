export function getEncodingFromMimeType(mimeType: string): "WEBM_OPUS" | "MP3" | "LINEAR16" {
  if (mimeType.includes("webm")) return "WEBM_OPUS";
  if (mimeType.includes("mp3") || mimeType.includes("mpeg")) return "MP3";
  return "LINEAR16";
}

export function getFileExtensionFromMimeType(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp3") || mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "bin";
}
