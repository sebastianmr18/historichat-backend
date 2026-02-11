import { GoogleGenerativeAI, Content, Part } from "@google/generative-ai";
import { env } from "../../config/env.js";
import { Message } from "../database/entities/Message.js";

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", // Actualizado a la versión más reciente disponible en 2026
    });
  }

  async generateResponse(
    systemPrompt: string,
    history: Message[],
    userQuery: string,
    contextRAG: string
  ): Promise<string> {
    try {
      // 1. Formatear historial para el SDK de Google
      const chatHistory: Content[] = history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }] as Part[]
      }));

      // 2. Iniciar chat con la instrucción de sistema (Plantilla del personaje)
      const chat = this.model.startChat({
        history: chatHistory,
        systemInstruction: {
          role: "system",
          parts: [{ text: systemPrompt }]
        },
      });

      // 3. Preparar el prompt final incluyendo el contexto RAG
      const finalPrompt = contextRAG 
        ? `[CONTEXTO RAG]\n${contextRAG}\n\n[PREGUNTA]\n${userQuery}`
        : userQuery;

      const result = await chat.sendMessage(finalPrompt);
      const response = await result.response;
      
      return response.text();
    } catch (error) {
      console.error("❌ Error en Gemini Service:", error);
      throw new Error("Error al generar respuesta con el LLM.");
    }
  }
}