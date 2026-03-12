import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";
import { Message } from "../database/entities/Message.js";
import { GENUI_RESPONSE_SCHEMA, buildGenUISystemPrompt } from "./genui.schema.js";
import { logger } from "../logging/logger.js";

export interface GenUIResponse {
  content: string;
  blocks: Array<{
    id?: string;
    type: string;
    content?: string;
    componentName?: string;
    props?: Record<string, unknown>;
  }>;
}

type GenUIBlock = GenUIResponse["blocks"][number];

export class GeminiService {
  private genAI: GoogleGenAI;

  constructor() {
    this.genAI = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  async generateResponse(
    characterName: string,
    role: string,
    biography: string,
    history: Message[],
    userQuery: string,
    contextRAG: string
  ): Promise<GenUIResponse> {
    try {
      const systemInstruction = buildGenUISystemPrompt(characterName, role, biography);

      // Format history for new SDK
      const formattedHistory = history
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        }));

      // Validate first message is from user
      const firstUserIndex = formattedHistory.findIndex((m) => m.role === "user");
      const validHistory =
        firstUserIndex > 0
          ? formattedHistory.slice(firstUserIndex)
          : firstUserIndex === -1
            ? []
            : formattedHistory;

      // Prepare final prompt with RAG context
      const finalPrompt = contextRAG
        ? `[CONTEXTO RAG]\n${contextRAG}\n\n[PREGUNTA]\n${userQuery}`
        : userQuery;

      const generationConfig = {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: GENUI_RESPONSE_SCHEMA,
        systemInstruction,
      };

      const result = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          ...validHistory,
          {
            role: "user",
            parts: [{ text: finalPrompt }],
          },
        ],
        config: generationConfig,
      });

      const responseText = result.text;

      if (!responseText) {
        logger.error("[gemini.generateResponse] empty_response", { userQuery });
        throw new Error("Gemini returned empty response");
      }

      // Parse and validate JSON response
      const parsed = this.parseAndValidateResponse(responseText);
      return parsed;
    } catch (error) {
      logger.error("[gemini.generateResponse] failed", {
        error: error instanceof Error ? error.message : String(error),
        userQuery,
      });
      throw new Error("Error al generar respuesta con el LLM.");
    }
  }

  private parseAndValidateResponse(rawResponse: string): GenUIResponse {
    try {
      let cleanedResponse = rawResponse.trim();

      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.slice(7);
      }
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith("```")) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }

      const parsed = JSON.parse(cleanedResponse.trim()) as GenUIResponse;

      // Validate required fields
      if (!parsed.content || typeof parsed.content !== "string") {
        throw new Error("Missing or invalid 'content' field");
      }

      if (!Array.isArray(parsed.blocks)) {
        throw new Error("Missing or invalid 'blocks' array");
      }

      const sanitizedBlocks = this.sanitizeBlocks(parsed.blocks);
      const finalBlocks = sanitizedBlocks.length > 0
        ? sanitizedBlocks
        : [{ type: "text", content: parsed.content.trim() }];

      return {
        content: parsed.content.trim(),
        blocks: finalBlocks,
      };
    } catch (error) {
      logger.error("[gemini.parseResponse] failed", {
        error: error instanceof Error ? error.message : String(error),
        rawResponse: rawResponse.substring(0, 500),
      });

      // Fallback: treat raw response as plain text
      return {
        content: rawResponse.trim(),
        blocks: [
          {
            type: "text",
            content: rawResponse.trim(),
          },
        ],
      };
    }
  }

  private sanitizeBlocks(rawBlocks: GenUIBlock[]): GenUIBlock[] {
    const normalized: GenUIBlock[] = [];

    for (const block of rawBlocks) {
      if (!block || typeof block !== "object") {
        continue;
      }

      if (block.type === "text") {
        const text = typeof block.content === "string" ? block.content.trim() : "";
        if (!text) {
          continue;
        }

        normalized.push({
          id: block.id,
          type: "text",
          content: text,
        });
        continue;
      }

      if (block.type === "component") {
        if (block.componentName !== "InfoCard") {
          continue;
        }

        if (!this.isValidInfoCardProps(block.props)) {
          continue;
        }

        normalized.push({
          id: block.id,
          type: "component",
          componentName: "InfoCard",
          props: block.props,
        });
      }
    }

    return normalized;
  }

  private isValidInfoCardProps(props: unknown): props is Record<string, unknown> {
    if (!props || typeof props !== "object" || Array.isArray(props)) {
      return false;
    }

    const value = props as Record<string, unknown>;
    if (typeof value.title !== "string" || !value.title.trim()) {
      return false;
    }

    if (value.description !== undefined && typeof value.description !== "string") {
      return false;
    }

    if (value.items === undefined) {
      return true;
    }

    if (!Array.isArray(value.items)) {
      return false;
    }

    return value.items.every((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return false;
      }

      const casted = item as Record<string, unknown>;
      return typeof casted.label === "string" && casted.label.trim().length > 0
        && typeof casted.value === "string" && casted.value.trim().length > 0;
    });
  }
}