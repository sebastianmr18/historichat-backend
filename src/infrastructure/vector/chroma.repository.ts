import { CloudClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";
import { env } from "../../config/env.js";
import { logger } from "../logging/logger.js";

export class ChromaRepository {
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_BACKOFF_MS = 200;
  private static readonly INFRA_TIMEOUT_MS = 10000;

  private client: CloudClient | null;
  private embedder = new DefaultEmbeddingFunction({ dtype: "fp16" });
  private collectionCache = new Map<string, any>();

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getBackoffDelayMs(attempt: number): number {
    const exp = Math.pow(2, attempt - 1);
    const jitter = Math.floor(Math.random() * 120);
    return ChromaRepository.BASE_BACKOFF_MS * exp + jitter;
  }

  private shouldRetry(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const anyErr = error as Error & { status?: number; code?: string };
    const message = (anyErr.message || "").toLowerCase();

    return (
      message.includes("timeout") ||
      message.includes("etimedout") ||
      message.includes("econnreset") ||
      message.includes("enotfound") ||
      message.includes("fetch failed") ||
      message.includes("network") ||
      anyErr.status === 429
    );
  }

  private async executeWithRetry<T>(
    label: string,
    fn: () => Promise<T>,
    context: Record<string, unknown>
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= ChromaRepository.MAX_RETRIES; attempt++) {
      const startedAt = Date.now();
      try {
        const value = await fn();
        logger.debug(`[RAG][ChromaRepository] ${label}:ok`, {
          ...context,
          attempt,
          durationMs: Date.now() - startedAt,
        });
        return value;
      } catch (error) {
        lastError = error;
        const retryable = this.shouldRetry(error);
        const isLast = attempt === ChromaRepository.MAX_RETRIES;
        const delayMs = this.getBackoffDelayMs(attempt);

        logger.warn(`[RAG][ChromaRepository] ${label}:failed`, {
          ...context,
          attempt,
          retryable,
          willRetry: retryable && !isLast,
          delayMs,
          durationMs: Date.now() - startedAt,
          error: this.toErrorPayload(error),
        });

        if (!retryable || isLast) {
          break;
        }

        await this.sleep(delayMs);
      }
    }

    throw lastError;
  }

  private async getOrCreateCollection(cleanName: string): Promise<any> {
    const cached = this.collectionCache.get(cleanName);
    if (cached) {
      return cached;
    }

    if (!this.client) {
      throw new Error("Chroma client is unavailable");
    }

    const collection = await this.executeWithRetry(
      "getCollection",
      () =>
        this.client!.getCollection({
          name: cleanName,
          embeddingFunction: this.embedder,
        }),
      {
        collection: cleanName,
      }
    );

    this.collectionCache.set(cleanName, collection);
    return collection;
  }

  private toErrorPayload(error: unknown) {
    if (!(error instanceof Error)) {
      return { message: String(error), probableCause: "unknown" };
    }

    const anyErr = error as Error & { code?: string; status?: number; cause?: unknown };
    const message = anyErr.message || "Unknown Chroma error";
    const lowerMessage = message.toLowerCase();

    let probableCause = "unknown";
    if (lowerMessage.includes("cors")) {
      probableCause = "cors-or-network";
    } else if (
      lowerMessage.includes("timeout") ||
      lowerMessage.includes("etimedout") ||
      lowerMessage.includes("econnreset") ||
      lowerMessage.includes("enotfound") ||
      lowerMessage.includes("fetch failed") ||
      lowerMessage.includes("network")
    ) {
      probableCause = "network-timeout-dns";
    } else if (
      lowerMessage.includes("unauthorized") ||
      lowerMessage.includes("forbidden") ||
      anyErr.status === 401 ||
      anyErr.status === 403
    ) {
      probableCause = "auth-permissions";
    } else if (anyErr.status === 429 || lowerMessage.includes("rate")) {
      probableCause = "rate-limit";
    }

    if (lowerMessage.includes("timeout") || lowerMessage.includes("etimedout")) {
      probableCause = "infra-timeout";
    }

    return {
      name: anyErr.name,
      message,
      code: anyErr.code,
      status: anyErr.status,
      probableCause,
      cause: anyErr.cause,
      stack: anyErr.stack,
    };
  }


  
  constructor() {
    if (!env.CHROMA_HOST) {
      logger.warn("[RAG][ChromaRepository] CHROMA_HOST not configured - RAG disabled");
      this.client = null;
      return;
    }

    this.client = new CloudClient({
      host: env.CHROMA_HOST,
      apiKey: env.CHROMA_API_KEY,
      tenant: env.CHROMA_TENANT,
      database: env.CHROMA_DATABASE,
    });

    logger.info("[RAG][ChromaRepository] initialized", {
      host: env.CHROMA_HOST,
      tenant: env.CHROMA_TENANT,
      database: env.CHROMA_DATABASE,
      hasApiKey: Boolean(env.CHROMA_API_KEY),
      corsAllowOrigins: env.CHROMA_SERVER_CORS_ALLOW_ORIGINS,
    });
  }

  async getContext(query: string, collectionName: string): Promise<string> {
    const startedAt = Date.now();
    const cleanName = collectionName.replace(/"/g, '').trim();
    logger.debug("[RAG][ChromaRepository] getContext:start", {
      collectionName,
      cleanName,
      queryPreview: query.slice(0, 180),
      queryLength: query.length,
      host: env.CHROMA_HOST,
      tenant: env.CHROMA_TENANT,
      database: env.CHROMA_DATABASE,
    });

    if (!this.client) {
      logger.warn("[RAG][ChromaRepository] getContext:client-unavailable", {
        collectionName,
        cleanName,
        host: env.CHROMA_HOST,
      });
      return "";
    }

    if (!cleanName || cleanName === "") {
      logger.warn("[RAG][ChromaRepository] getContext:missing-collection", {
        collectionName,
      });
      return ""; 
    }

    try {
      const collection = await this.getOrCreateCollection(cleanName);

      const results = await this.executeWithRetry(
        "query",
        () =>
          collection.query({
            queryTexts: [query],
            nResults: 4,
          }),
        {
          collection: cleanName,
          queryLength: query.length,
        }
      ) as { documents?: (Array<string | null> | undefined)[] };

      const docs = results.documents?.[0]?.filter((doc): doc is string => doc !== null) ?? [];
      logger.debug("[RAG][ChromaRepository] getContext:query-results", {
        collection: cleanName,
        hits: docs.length,
        sample: docs.slice(0, 2),
        durationMs: Date.now() - startedAt,
      });

      // Validar si hay documentos y aplanarlos
      if (docs.length > 0) {
        const context = docs.join("\n---\n");
        logger.debug("[RAG][ChromaRepository] getContext:success", {
          collection: cleanName,
          contextLength: context.length,
          durationMs: Date.now() - startedAt,
        });
        return context;
      }

      logger.debug("[RAG][ChromaRepository] getContext:empty", {
        collection: cleanName,
        durationMs: Date.now() - startedAt,
      });

      return "";
    } catch (error) {
      // Invalidate cached collection on failures to avoid sticky broken handles.
      this.collectionCache.delete(cleanName);

      logger.error("[RAG][ChromaRepository] getContext:error", {
        collectionName,
        cleanName,
        host: env.CHROMA_HOST,
        tenant: env.CHROMA_TENANT,
        database: env.CHROMA_DATABASE,
        corsAllowOrigins: env.CHROMA_SERVER_CORS_ALLOW_ORIGINS,
        durationMs: Date.now() - startedAt,
        error: this.toErrorPayload(error),
      });
      return ""; // No rompemos el flujo si el RAG falla
    }
  }
}