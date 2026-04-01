import { GoogleGenerativeAI, Content, Part } from "@google/generative-ai";
import { env } from "../../config/env.js";
import { Message } from "../database/entities/Message.js";
import { logger } from "../logging/logger.js";

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;
  private modelWithSchema: (schema: unknown) => ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", // Actualizado a la versión más reciente disponible en 2026
    });
    // Store a reference to create models with schemas
    this.modelWithSchema = (schema: unknown) => this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseSchema: schema,
        responseMimeType: "application/json",
      } as any,
    });
  }

  async generateResponse(
    systemPrompt: string,
    history: Message[],
    userQuery: string,
    contextRAG?: string,
    responseSchema?: unknown
  ): Promise<{ text: string; structuredOutput?: unknown }> {
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
          return { text: responseText, structuredOutput };
        } catch (parseError) {
          logger.warn("[gemini] failed to parse structured output, returning raw text", { error: parseError });
          return { text: responseText };
        }
      }

      return { text: responseText };
    } catch (error) {
      logger.error("[gemini] generateResponse failed", { error });
      throw new Error("Error al generar respuesta con el LLM.");
    }
  }
}