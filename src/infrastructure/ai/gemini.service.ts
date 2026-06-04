/**
 * @file gemini.service.ts
 * @description Proveedor de servicio LLM para la API de Google Gemini.
 * Gestiona el formateo del historial, la inyeccion de prompts del sistema y usuario,
 * y permite forzar la generacion de respuestas estructuradas bajo un esquema JSON determinado.
 */

import { GoogleGenerativeAI, Content, Part } from "@google/generative-ai";
import { env } from "../../config/env.js";
import { logger } from "../logging/logger.js";
import { buildFinalUserPrompt } from "../../application/prompts/user-prompt-builder.js";
import {
  LlmGenerateResponse,
  LlmHistoryMessage,
  LlmProvider,
  LlmProviderError,
} from "./llm-provider.interface.js";

/**
 * Adaptador del proveedor Gemini que implementa la interfaz LlmProvider.
 */
export class GeminiService implements LlmProvider {
  /** Nombre identificador del proveedor. */
  public readonly providerName = "gemini";
  /** Cliente instanciado del SDK oficial de Google Generative AI. */
  private genAI: GoogleGenerativeAI;
  /** Modelo por defecto instanciado para chats normales. */
  private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;
  /** Generador de modelos especificos configurados para salidas JSON estructuradas. */
  private modelWithSchema: (schema: unknown) => ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;
  /** Nombre del modelo Gemini activo obtenido de la configuracion de entorno. */
  public readonly modelName: string;

  /**
   * Crea una instancia de GeminiService e inicializa el cliente y configuraciones del modelo.
   */
  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.modelName = env.GEMINI_CHAT_MODEL;
    this.model = this.genAI.getGenerativeModel({
      model: this.modelName,
    });
    // Almacenar una referencia para crear instancias de modelos con esquemas estructurados de forma dinamica.
    this.modelWithSchema = (schema: unknown) => this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseSchema: schema,
        responseMimeType: "application/json",
      } as any,
    });
  }

  /**
   * Genera una respuesta conversacional invocando la API de Gemini.
   * Formatea adecuadamente el historial del chat para que cumpla con los requisitos del SDK
   * y envia el mensaje final sanitizado.
   *
   * @param systemPrompt - Instrucciones de comportamiento del sistema.
   * @param history - Historial previo de la conversacion.
   * @param userQuery - Mensaje enviado por el usuario.
   * @param contextRAG - Contexto documental del RAG (opcional).
   * @param responseSchema - Esquema de validacion de salida (opcional).
   * @returns La respuesta generada y estructurada del modelo.
   * @throws LlmProviderError ante fallos en la llamada a la API de Gemini.
   */
  async generateResponse(
    systemPrompt: string,
    history: LlmHistoryMessage[],
    userQuery: string,
    contextRAG?: string,
    responseSchema?: unknown
  ): Promise<LlmGenerateResponse> {
    try {
      const iterationId = `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // 1. Formatear historial para el SDK de Google
      let chatHistory: Content[] = history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }] as Part[]
      }));

      // 2. Validar que el primer mensaje sea de usuario (requisito estricto de Gemini)
      const firstUserIndex = chatHistory.findIndex(m => m.role === 'user');
      const originalHistoryCount = chatHistory.length;
      if (firstUserIndex > 0) {
        // Descartar mensajes previos al primer usuario
        chatHistory = chatHistory.slice(firstUserIndex);
      } else if (firstUserIndex === -1) {
        // No hay ningun mensaje de usuario en el historial, comenzar vacio
        chatHistory = [];
      }

      // Utilizar modelo con esquema estructurado si se provee
      const model = responseSchema ? this.modelWithSchema(responseSchema) : this.model;

      // 3. Iniciar chat con la instruccion de sistema (Identity & Behavior Rules)
      const chat = model.startChat({
        history: chatHistory,
        systemInstruction: {
          role: "system",
          parts: [{ text: systemPrompt }]
        },
      });

      // 4. Construir el prompt de usuario con las etiquetas estructurales y el RAG
      const finalPrompt = buildFinalUserPrompt(userQuery, contextRAG);

      logger.debug("[gemini.iteration.input]", {
        iterationId,
        model: this.modelName,
        systemPrompt,
        historyOriginalCount: originalHistoryCount,
        historySentCount: chatHistory.length,
        historyDroppedCount: Math.max(0, originalHistoryCount - chatHistory.length),
        historySent: chatHistory,
        finalPrompt,
      });

      const result = await chat.sendMessage(finalPrompt);
      const response = await result.response;
      const responseText = response.text();

      // Si se solicito una salida estructurada, intentar parsearla a JSON
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