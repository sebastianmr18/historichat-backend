import { GeminiLiveAdapter } from '../../infrastructure/ai/gemini-live.adapter.js';

type TurnState = 'IDLE' | 'LISTENING' | 'RESPONDING';

/**
 * Service to manage the lifecycle and data flow of a real-time audio session.
 *
 * Cambios principales:
 * - Introduce TurnState para detener/reabrir turnos correctamente.
 * - Implementa BARGE-IN: si el usuario habla mientras Gemini está RESPONDING,
 *   se interrumpe la generación (se llama adapter.endTurn()) y se corta el audio.
 * - Se elimina la lógica de "reopenTurn" por parte del adapter cuando Gemini habla.
 */
export class RealtimeAudioService {
  private adapter: GeminiLiveAdapter;
  private endTurnTimer?: NodeJS.Timeout;
  private turnOpen = true;
  private state: TurnState = 'IDLE';

  // Parámetros ajustables
  private readonly RMS_THRESHOLD_NORMALIZED = 0.02;
  private readonly SILENCE_TIMEOUT_MS = 600;
  private readonly INITIAL_SILENCE_TIMEOUT_MS = 800;

  constructor() {
    this.adapter = new GeminiLiveAdapter();
  }

  /**
   * Inicializa el adaptador y ata los hooks provistos.
   */
  public async initialize(hooks: {
    onOpen?: () => void;
    onAudio: (buffer: Buffer) => void;
    onText: (text: string) => void;
    onInterrupted: () => void;
    onError: (error: string) => void;
  }): Promise<void> {
    if (hooks.onOpen) {
      this.adapter.on('open', hooks.onOpen);
    }

    // Cuando Gemini envía audio -> eso indica que el modelo está RESPONDING
    this.adapter.on('audio', (buffer: Buffer) => {
      // Gemini comenzó a responder; marcar estado.
      this.state = 'RESPONDING';
      // Notificar al consumidor (gateway -> cliente)
      hooks.onAudio(buffer);
    });

    // Cuando Gemini envía texto -> lo consideramos parte de RESPONDING también
    this.adapter.on('text', (text: string) => {
      this.state = 'RESPONDING';
      hooks.onText(text);
    });

    // Propagar 'interrupted' del adapter hacia los hooks
    this.adapter.on('interrupted', () => {
      // Si Gemini mismo notifica que se interrumpió, aseguramos limpiar estado local.
      this.state = 'IDLE';
      this.turnOpen = false;
      if (this.endTurnTimer) {
        clearTimeout(this.endTurnTimer);
        this.endTurnTimer = undefined;
      }
      hooks.onInterrupted();
    });

    this.adapter.on('error', (err) => hooks.onError(err.message));

    await this.adapter.connect();
  }

  /**
   * Recibe audio PCM16LE desde el cliente.
   * Implementa:
   *  - detección de voz por RMS
   *  - BARGE-IN: si el usuario habla mientras Gemini está RESPONDING -> interrumpe
   *  - envía audio al adapter solo si el estado lo permite
   */
  public async handleClientAudio(chunk: Buffer): Promise<void> {
    // 1) Calcular RMS (int16)
    const rms = this.computeRmsFromInt16Buffer(chunk);
    const rmsNormalized = rms / 32768;
    const voiceDetected = rmsNormalized >= this.RMS_THRESHOLD_NORMALIZED;

    // DEBUG log (útil para tuning)
    console.log(
      `Bytes recibidos: ${chunk.byteLength}, samples=${chunk.byteLength / 2}, rms=${rms.toFixed(
        1
      )}, rmsNorm=${rmsNormalized.toFixed(4)}, voice=${voiceDetected}`
    );

    // 2) BARGE-IN: Usuario habla mientras Gemini está RESPONDING
    if (voiceDetected && this.state === 'RESPONDING') {
      console.log('🔴 Usuario interrumpe a Gemini — barge-in detectado');

      // Cambiar a estado de escucha
      this.state = 'LISTENING';
      this.turnOpen = true;

      // Cancelar timer si existe
      if (this.endTurnTimer) {
        clearTimeout(this.endTurnTimer);
        this.endTurnTimer = undefined;
      }

      // Pedir a Gemini que termine la generación (endTurn) para liberarlo
      try {
        await this.adapter.endTurn();
      } catch (err) {
        console.error('Error al enviar endTurn por interrupción:', err);
      }

      // Emitir 'interrupted' localmente para que gateway/frontend corten audio de inmediato.
      // El adapter también podrá emitir 'interrupted' si el servidor confirma.
      this.adapter.emit('interrupted');
    }

    // 3) Enviar audio al adapter solo si estamos en LISTENING o IDLE
    if (this.state !== 'LISTENING' && this.state !== 'IDLE') {
      // Si estamos RESPONDING (y no hubo barge-in), no enviar audio del cliente.
      return;
    }

    // A partir de aquí, consideramos que el usuario está en modo LISTENING (hablando)
    this.state = 'LISTENING';

    try {
      await this.adapter.sendAudio(chunk);
      // El envío es un latido visual en logs
      process.stdout.write('.');
    } catch (err) {
      console.error('Error enviando audio al adapter:', err);
    }

    // 4) Gestionar timer de silencio: si detectamos voz, resetear con SILENCE_TIMEOUT_MS
    if (voiceDetected) {
      this.resetEndTurnTimer(this.SILENCE_TIMEOUT_MS);
    } else if (!this.endTurnTimer) {
      // Si no hay voz actualmente y no hay timer, iniciar un timer inicial
      this.resetEndTurnTimer(this.INITIAL_SILENCE_TIMEOUT_MS);
    }
  }

  /**
   * Limpieza de la sesión.
   */
  public destroy(): void {
    if (this.endTurnTimer) clearTimeout(this.endTurnTimer);
    this.adapter.disconnect();
  }

  // =======================
  // Helpers
  // =======================

  /**
   * Reinicia el timer que, al expirar por silencio, enviará endTurn al adapter.
   */
  private resetEndTurnTimer(timeoutMs: number): void {
    if (this.endTurnTimer) clearTimeout(this.endTurnTimer);

    this.endTurnTimer = setTimeout(async () => {
      // Si ya no está abierto el turno, no hacemos nada
      if (!this.turnOpen) return;

      console.log('🟡 End of turn (silence detected)');
      this.turnOpen = false;
      // Al expirar el timer, pasamos a RESPONDING porque esperamos que Gemini responda.
      this.state = 'RESPONDING';
      this.endTurnTimer = undefined;

      try {
        await this.adapter.endTurn();
      } catch (err) {
        console.error('Error sending endTurn:', err);
      }
    }, timeoutMs);
  }

  /**
   * Calcula RMS desde un Buffer Int16LE.
   * Retorna RMS en unidades de int16 (0..32768).
   */
  private computeRmsFromInt16Buffer(buffer: Buffer): number {
    const sampleCount = Math.floor(buffer.byteLength / 2);
    if (sampleCount <= 0) return 0;

    const int16 = new Int16Array(buffer.buffer, buffer.byteOffset, sampleCount);
    let sumSquares = 0;
    for (let i = 0; i < sampleCount; i++) {
      const v = int16[i];
      sumSquares += v * v;
    }
    const meanSquares = sumSquares / sampleCount;
    const rms = Math.sqrt(meanSquares);
    return rms;
  }
}
