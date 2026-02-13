export type LiveAdapterEvents = {
  open: () => void
  setupcomplete: () => void
  audio: (buffer: Buffer) => void
  text: (text: string) => void
  interrupted: () => void
  error: (err: Error) => void
  turncomplete: () => void
}
