import { GeminiLiveAdapter } from "../../infrastructure/ai/gemini-live.adapter.js"
import { logger } from "../../infrastructure/logging/logger.js"

type Hooks = {
  onOpen?: () => void
  onReady?: () => void
  onAudio: (b: Buffer) => void
  onText: (t: string) => void
  onInterrupted?: () => void
  onError?: (e: string) => void
  onAudioDropped?: (meta: any) => void
  onTurnComplete?: () => void
}

export class RealtimeAudioService {
  private adapter = new GeminiLiveAdapter()
  private silenceTimer?: NodeJS.Timeout
  private readonly SILENCE_TIMEOUT_MS = 700
  private waitingForResponse = false

  public async initialize(hooks: Hooks) {
    this.adapter.on("open", () => hooks.onOpen?.())
    this.adapter.on("setupcomplete", () => hooks.onReady?.())
    this.adapter.on("audio", (b: Buffer) => {
      // model audio coming back
      this.waitingForResponse = false
      hooks.onAudio(b)
    })
    this.adapter.on("text", (t: string) => {
      hooks.onText(t)
    })
    this.adapter.on("turncomplete", () => {
      this.waitingForResponse = false
      hooks.onTurnComplete?.()
    })
    this.adapter.on("interrupted", () => {
      this.waitingForResponse = false
      hooks.onInterrupted?.()
    })
    this.adapter.on("error", (err: any) => hooks.onError?.(err?.message ?? String(err)))
    this.adapter.on("dropped-audio", (meta) => hooks.onAudioDropped?.(meta))

    await this.adapter.connect()
    logger.info("RealtimeAudioService initialized")
  }

  public async handleClientAudio(chunk: Buffer) {
    // if model is currently generating a response, drop client audio (simple policy)
    if (this.waitingForResponse) {
      logger.warn("Dropping client audio while waiting for model response")
      return
    }

    // send chunk straight to adapter
    try {
      await this.adapter.sendAudio(chunk)
      logger.debug("Forwarded client chunk to adapter", { bytes: chunk.byteLength })
    } catch (err) {
      logger.error("Error forwarding chunk", err)
    }

    // restart silence timer
    if (this.silenceTimer) clearTimeout(this.silenceTimer)
    this.silenceTimer = setTimeout(async () => {
      logger.info("Silence detected: sending endOfTurn")
      this.waitingForResponse = true
      try {
        await this.adapter.endTurn()
      } catch (err) {
        logger.error("endTurn failed", err)
        this.waitingForResponse = false
      }
    }, this.SILENCE_TIMEOUT_MS)
  }

  public destroy() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer)
    this.adapter.disconnect()
  }
}
