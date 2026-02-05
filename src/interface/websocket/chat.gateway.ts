import { Server, Socket } from "socket.io";
import { ChatService } from "../../application/services/chat.service.js";
import { ElevenLabsService } from "../../infrastructure/ai/elevenlabs.service.js";

export class ChatGateway {
  constructor(
    private io: Server,
    private chatService: ChatService,
    private voiceService: ElevenLabsService
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
          const buffer = Buffer.from(data.audioBase64, 'base64');
          const transcription = await this.voiceService.speechToText(buffer);
          
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