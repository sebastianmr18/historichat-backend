import { Server, Socket } from "socket.io";
import { ChatService } from "../../application/services/chat.service.js";
import { ITextToSpeech, ISpeechToText } from "../../shared/types.js";

export class ChatGateway {
  constructor(
    private io: Server,
    private chatService: ChatService,
    private voiceService: ITextToSpeech & ISpeechToText
  ) {
    this.initialize();
  }

  private initialize() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`🔌 Cliente conectado: ${socket.id}`);

      // Suscribirse a una conversación (Reemplaza los grupos de Channels)
      socket.on("join_chat", (conversationId: string) => {
        socket.join(conversationId);
      });

      // Manejo de Texto
      socket.on("send_text", async (data: { conversationId: string, text: string }) => {
        await this.handleFlow(socket, data.conversationId, data.text);
      });

      // Manejo de Audio (STT -> Flow)
      socket.on("send_audio", async (data: { conversationId: string, audioBase64: string }) => {
        try {
          console.log("debug: esto llegó", data)
          const buffer = Buffer.from(data.audioBase64, 'base64');
          console.log("debug: buffer creado", buffer)
          const transcription = await this.voiceService.transcribe(buffer, 'WEBM_OPUS');
          console.log("debug: transcription", transcription)
          
          if (transcription.trim() === '') {
            socket.emit("no_speech", { message: "No se detectó habla en el audio. Inténtalo de nuevo." });
            return;
          }
          
          // Informar al usuario qué escuchamos (Feedback inmediato)
          socket.emit("transcription", { text: transcription });
          
          await this.handleFlow(socket, data.conversationId, transcription);
        } catch (error) {
          socket.emit("error", { message: "Error procesando audio" });
        }
      });

      socket.on("disconnect", () => console.log(`❌ Desconectado: ${socket.id}`));
    });
  }

  private async handleFlow(socket: Socket, conversationId: string, text: string) {
    try {
      const result = await this.chatService.processMessage(conversationId, text);
      
      // Emitir respuesta final a la sala de la conversación
      this.io.to(conversationId).emit("ai_message", {
        text: result.text,
        audio: result.audioBase64
      });
    } catch (error: any) {
      socket.emit("error", { message: error.message });
    }
  }
}