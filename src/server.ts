/**
 * @file server.ts
 * @description Punto de entrada de la aplicacion que inicializa la base de datos, servicios, HTTP y WebSockets.
 */
import "reflect-metadata";
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import { env } from './config/env.js';
import { AppDataSource } from './config/database.js';
import { logger } from './infrastructure/logging/logger.js';

import { GeminiService } from './infrastructure/ai/gemini.service.js';
import { GroqService } from './infrastructure/ai/groq.service.js';
import { LlmOrchestratorService } from './infrastructure/ai/llm-orchestrator.service.js';
import type { LlmProvider } from './infrastructure/ai/llm-provider.interface.js';
import { OpenRouterService } from './infrastructure/ai/openrouter.service.js';
import { GoogleCloudVoiceAdapter } from './infrastructure/ai/google-cloud-voice.adapter.js';
import { ChromaRepository } from './infrastructure/vector/chroma.repository.js';
import { ChatService } from './application/services/chat.service.js';
import { ChatGateway } from './interface/websocket/chat.gateway.js';
import { storageService } from './interface/storage/storage.service.js';
import { GeminiLiveAdapter } from './infrastructure/ai/gemini-live.adapter.js';
import { LiveCallService } from './application/services/live-call.service.js';
import { LiveGateway } from './interface/websocket/live.gateway.js';
import { Conversation } from './infrastructure/database/entities/Conversation.js';
import { Message } from './infrastructure/database/entities/Message.js';
import { Character } from './infrastructure/database/entities/Character.js';

const buildLlmProviders = (): LlmProvider[] => {
  const availableProviders = new Map<string, LlmProvider>();

  availableProviders.set('gemini', new GeminiService());

  if (env.GROQ_API_KEY) {
    availableProviders.set('groq', new GroqService());
  }

  if (env.OPENROUTER_API_KEY) {
    availableProviders.set('openrouter', new OpenRouterService());
  }

  const orderedNames = env.LLM_FALLBACK_ORDER
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);

  const orderedProviders: LlmProvider[] = [];
  for (const name of orderedNames) {
    const provider = availableProviders.get(name);
    if (!provider) {
      continue;
    }

    orderedProviders.push(provider);
    availableProviders.delete(name);
  }

  for (const provider of availableProviders.values()) {
    orderedProviders.push(provider);
  }

  logger.info('[server] llm_providers_configured', {
    providers: orderedProviders.map((provider) => ({
      name: provider.providerName,
      model: provider.modelName,
    })),
  });

  return orderedProviders;
};

const startServer = async () => {
  try {
    await AppDataSource.initialize();
    logger.info("Conexión a PostgreSQL (TypeORM) establecida");

    const llmService = new LlmOrchestratorService(buildLlmProviders());
    const googleCloudVoiceAdapter = new GoogleCloudVoiceAdapter();
    const chromaRepo = new ChromaRepository();

    const chatService = new ChatService(
      llmService,
      googleCloudVoiceAdapter,
      chromaRepo,
      storageService,
      AppDataSource.getRepository(Conversation),
      AppDataSource.getRepository(Message),
      AppDataSource,
    );

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
    logger.info("ChatGateway inicializado");

    const geminiLiveAdapter = new GeminiLiveAdapter();
    const liveCallService = new LiveCallService(geminiLiveAdapter, chromaRepo, AppDataSource.getRepository(Character));
    new LiveGateway(io, liveCallService);
    logger.info("LiveGateway inicializado (namespace /live)");

    const PORT = env.PORT || 8000;
    httpServer.listen(PORT, () => {
      logger.info(`Servidor activo — puerto: ${PORT}, modo: ${env.NODE_ENV}`);
    });

    const shutdown = async () => {
      logger.info("Apagando servicios...");
      await AppDataSource.destroy();
      httpServer.close(() => {
        logger.info("Servidor HTTP cerrado");
        process.exit(0);
      });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error("Fallo en el arranque del servidor", { error });
    process.exit(1);
  }
};

startServer();