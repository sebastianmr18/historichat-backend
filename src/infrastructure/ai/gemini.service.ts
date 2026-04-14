import { GoogleGenerativeAI, Content, Part } from "@google/generative-ai";
import { env } from "../../config/env.js";
import { logger } from "../logging/logger.js";
import {
  LlmGenerateResponse,
  LlmHistoryMessage,
  LlmProvider,
  LlmProviderError,
} from "./llm-provider.interface.js";

export class GeminiService implements LlmProvider {
  public readonly providerName = "gemini";
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;
  private modelWithSchema: (schema: unknown) => ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;
  public readonly modelName: string;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.modelName = env.GEMINI_CHAT_MODEL;
    this.model = this.genAI.getGenerativeModel({
      model: this.modelName,
    });
    // Store a reference to create models with schemas.
    this.modelWithSchema = (schema: unknown) => this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseSchema: schema,
        responseMimeType: "application/json",
      } as any,
    });
  }

  async generateResponse(
    systemPrompt: string,
    history: LlmHistoryMessage[],
    userQuery: string,
    contextRAG?: string,
    responseSchema?: unknown
  ): Promise<LlmGenerateResponse> {
    try {
      // 1. Formatear historial para el SDK de Google
      let chatHistory: Content[] = history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }] as Part[]
      }));

      // 2. Validar que el primer mensaje sea de usuario
      const firstUserIndex = chatHistory.findIndex(m => m.role === 'user');
      if (firstUserIndex > 0) {
        // Descartar mensajes previos al primer usuario (probablemente del asistente)
        chatHistory = chatHistory.slice(firstUserIndex);
      } else if (firstUserIndex === -1) {
        // No hay ningún mensaje de usuario en el historial, comenzar vacío
        chatHistory = [];
      }

      // Use model with schema if responseSchema is provided
      const model = responseSchema ? this.modelWithSchema(responseSchema) : this.model;

      // 3. Iniciar chat con la instrucción de sistema (Plantilla del personaje)
      const chat = model.startChat({
        history: chatHistory,
        systemInstruction: {
          role: "system",
          parts: [{ text: systemPrompt }]
        },
      });

      // 4. Preparar el prompt final incluyendo el contexto RAG
      const finalPrompt = contextRAG 
        ? `[CONTEXTO RAG]\n${contextRAG}\n\n[PREGUNTA]\n${userQuery}`
        : userQuery;

      const result = await chat.sendMessage(finalPrompt);
      const response = await result.response;
      const responseText = response.text();

      // If we requested structured output, parse it
      if (responseSchema) {
        try {
          const structuredOutput = JSON.parse(responseText);
          return {
            text: responseText,
            structuredOutput,
            provider: this.providerName,
            model: this.modelName,
          };
        } catch (parseError) {
          logger.warn("[gemini] failed to parse structured output, returning raw text", { error: parseError });
          return {
            text: responseText,
            provider: this.providerName,
            model: this.modelName,
          };
        }
      }

      return {
        text: responseText,
        provider: this.providerName,
        model: this.modelName,
      };
    } catch (error) {
      logger.error("[gemini] generateResponse failed", { error });
      throw new LlmProviderError(this.providerName, this.modelName, "Error al generar respuesta con el LLM.", {
        cause: error,
        retryable: true,
      });
    }
  }
}