import "reflect-metadata";
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import { env } from './config/env.js';
import { AppDataSource } from './config/database.js';

import { GeminiService } from './infrastructure/ai/gemini.service.js';
import { GoogleCloudVoiceAdapter } from './infrastructure/ai/google-cloud-voice.adapter.js';
import { ChromaRepository } from './infrastructure/vector/chroma.repository.js';
import { ChatService } from './application/services/chat.service.js';
import { ChatGateway } from './interface/websocket/chat.gateway.js';
import { storageService } from './interface/storage/storage.service.js';

const startServer = async () => {
  try {
    await AppDataSource.initialize();
    console.log("💾 Conexión a PostgreSQL (TypeORM) establecida.");

    const geminiService = new GeminiService();
    const googleCloudVoiceAdapter = new GoogleCloudVoiceAdapter();
    const chromaRepo = new ChromaRepository();

    const chatService = new ChatService(geminiService, googleCloudVoiceAdapter, chromaRepo, storageService);

    const httpServer = createServer(app);
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.CORS_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      maxHttpBufferSize: 1e6 * 10, // 10MB
    });

    new ChatGateway(io, chatService);
    console.log("🛰️ ChatGateway inicializado.");

    const PORT = env.PORT || 8000;
    httpServer.listen(PORT, () => {
      console.log(`
      🚀 SISTEMA ACTIVO
      Puerto: ${PORT}
      Modo: ${env.NODE_ENV}
      `);
    });

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
    console.error("❌ Fallo en el arranque:", error);
    process.exit(1);
  }
};

startServer();