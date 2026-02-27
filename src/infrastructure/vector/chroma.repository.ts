import { CloudClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";
import { env } from "../../config/env.js";
import { logger } from "../logging/logger.js";

export class ChromaRepository {
  private client: CloudClient;
  private embedder = new DefaultEmbeddingFunction({ dtype: "fp16" });


  
  constructor() {
    this.client = new CloudClient({
      host: env.CHROMA_HOST,
      apiKey: env.CHROMA_API_KEY,
      tenant: env.CHROMA_TENANT,
      database: env.CHROMA_DATABASE,
    });
  }

  async getContext(query: string, collectionName: string): Promise<string> {
    const cleanName = collectionName.replace(/"/g, '').trim();
    logger.debug("[RAG][ChromaRepository] getContext:start", {
      collectionName,
      cleanName,
      queryPreview: query.slice(0, 180),
      queryLength: query.length,
    });

    if (!cleanName || cleanName === "") {
      logger.warn("[RAG][ChromaRepository] getContext:missing-collection", {
        collectionName,
      });
      return ""; 
    }

    try {
      const collection = await this.client.getCollection({
        name: cleanName,
        embeddingFunction: this.embedder,
      });

      const results = await collection.query({
        queryTexts: [query],
        nResults: 4,
      });

      const docs = results.documents?.[0]?.filter((doc): doc is string => doc !== null) ?? [];
      logger.debug("[RAG][ChromaRepository] getContext:query-results", {
        collection: cleanName,
        hits: docs.length,
        sample: docs.slice(0, 2),
      });

      // Validar si hay documentos y aplanarlos
      if (docs.length > 0) {
        const context = docs.join("\n---\n");
        logger.debug("[RAG][ChromaRepository] getContext:success", {
          collection: cleanName,
          contextLength: context.length,
        });
        return context;
      }

      logger.debug("[RAG][ChromaRepository] getContext:empty", {
        collection: cleanName,
      });

      return "";
    } catch (error) {
      logger.error(`[RAG][ChromaRepository] getContext:error (${collectionName})`, error);
      return ""; // No rompemos el flujo si el RAG falla
    }
  }
}