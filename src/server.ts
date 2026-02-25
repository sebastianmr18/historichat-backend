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

// Live Audio
import { InMemorySessionRepository } from './infrastructure/database/InMemorySessionRepository.js';
import { GeminiLiveClient } from './infrastructure/ai/GeminiLiveClient.js';
import { HandleGeminiMessage } from './domain/agent/use-cases/HandleGeminiMessage.js';
import { StartSession } from './domain/agent/use-cases/StartSession.js';
import { HandleAudioInput } from './domain/agent/use-cases/HandleAudioInput.js';
import { EndSession } from './domain/agent/use-cases/EndSession.js';
import { LiveAudioGateway } from './interface/websocket/live-audio.gateway.js';

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

    // Live Audio
    const sessionRepository = new InMemorySessionRepository();
    const geminiLiveApiKey = env.GEMINI_API_KEY;
    if (!geminiLiveApiKey) throw new Error("GEMINI_API_KEY no definida");

    const handleGeminiMessage = new HandleGeminiMessage(sessionRepository, null as any);
    const geminiLiveClient = new GeminiLiveClient(geminiLiveApiKey, handleGeminiMessage);

    const startSession = new StartSession(sessionRepository, geminiLiveClient);
    const handleAudioInput = new HandleAudioInput(sessionRepository, geminiLiveClient);
    const endSession = new EndSession(sessionRepository, geminiLiveClient);

    const liveAudioGateway = new LiveAudioGateway(io, startSession, handleAudioInput, endSession);
    handleGeminiMessage.setNotifier(liveAudioGateway);

    console.log("🛰️ LiveAudioGateway inicializado.");

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