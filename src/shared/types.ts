export type LiveAdapterEvents = {
  open: () => void
  setupcomplete: () => void
  audio: (buffer: Buffer) => void
  text: (text: string) => void
  interrupted: () => void
  error: (err: Error) => void
  turncomplete: () => void
}

export interface ITextToSpeech {
  synthesize(text: string, voiceName?: string): Promise<Buffer>;
}

export interface ISpeechToText {
  transcribe(audioBuffer: Buffer, encoding?: 'WEBM_OPUS' | 'MP3' | 'LINEAR16'): Promise<string>;
}
