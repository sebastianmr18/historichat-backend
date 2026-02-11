import "reflect-metadata";
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import { env } from './config/env.js';
import { AppDataSource } from './config/database.js';

import { GeminiService } from './infrastructure/ai/gemini.service.js';
import { ElevenLabsService } from './infrastructure/ai/elevenlabs.service.js';
import { ChromaRepository } from './infrastructure/vector/chroma.repository.js';
import { ChatService } from './application/services/chat.service.js';
import { ChatGateway } from './interface/websocket/chat.gateway.js';

import { LiveAudioGateway } from './interface/websocket/live-audio.gateway.js';

const startServer = async () => {
  try {
    /**
     * Inicialización de Capa de Infraestructura
     */
    await AppDataSource.initialize();
    console.log("💾 Conexión a PostgreSQL (TypeORM) establecida.");

    const geminiService = new GeminiService();
    const elevenLabsService = new ElevenLabsService();
    const chromaRepo = new ChromaRepository();

    /**
     * Inicialización de Capa de Aplicación
     */
    const chatService = new ChatService(geminiService, elevenLabsService, chromaRepo);

    /**
     * Inicialización de Capa de Interfaz (Servidores)
     */
    const httpServer = createServer(app);
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.CORS_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
    });

    new ChatGateway(io, chatService, elevenLabsService);
    console.log("🛰️ ChatGateway inicializado en namespace por defecto.");

    new LiveAudioGateway(io);
    console.log("🛰️ LiveAudioGateway inicializado en namespace '/realtime'.");

  
    const PORT = env.PORT || 8000;
    httpServer.listen(PORT, () => {
      console.log(`
      🚀 SISTEMA ACTIVO
      Puerto: ${PORT}
      Modo: ${env.NODE_ENV}
      `);
    });

    /**
     * Graceful Shutdown
     */
    const shutdown = async () => {
      console.log('\n🛑 Apagando servicios...');
      await AppDataSource.destroy();
      httpServer.close(() => {
        console.log('Servidor HTTP cerrado.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error("❌ Fallo en el arranque del servidor:", error);
    process.exit(1);
  }
};

startServer();