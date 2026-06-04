/**
 * @file chroma.repository.ts
 * @description Repositorio de acceso a la base de datos vectorial ChromaDB.
 * Permite gestionar colecciones, insertar o actualizar fragmentos de documentos (embeddings)
 * y realizar consultas de busqueda semantica para el sistema de RAG (Generacion Aumentada por Recuperacion)
 * con politicas de reintento automatico ante fallos de red.
 */

import { CloudClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";
import { env } from "../../config/env.js";
import { logger } from "../logging/logger.js";
import { KnowledgeBaseChunk } from "../../domain/rag/knowledge-base.types.js";

/**
 * Clase de repositorio para interactuar con ChromaDB Cloud / Local.
 * Centraliza la logica de conexion, reintentos (exponential backoff) y busqueda de contexto.
 */
export class ChromaRepository {
  /** Cliente oficial de la API de ChromaDB. */
  private client: CloudClient;
  /** Funcion por defecto para generar embeddings de texto localmente o mediante la API. */
  private embedder = new DefaultEmbeddingFunction({ dtype: "fp16" });

  /** Reintentos maximos para operaciones fallidas. */
  private readonly maxRetries = env.CHROMA_OPERATION_MAX_RETRIES;
  /** Retraso base inicial para el calculo de exponencial backoff. */
  private readonly baseDelayMs = env.CHROMA_OPERATION_BASE_DELAY_MS;
  /** Retraso maximo permitido entre reintentos. */
  private readonly maxDelayMs = env.CHROMA_OPERATION_MAX_DELAY_MS;

  /**
   * Crea una instancia de ChromaRepository e inicializa el cliente con los parametros de configuracion.
   */
  constructor() {
    this.client = new CloudClient({
      host: env.CHROMA_HOST,
      apiKey: env.CHROMA_API_KEY,
      tenant: env.CHROMA_TENANT,
      database: env.CHROMA_DATABASE,
    });
  }

  /**
   * Detiene la ejecucion de la promesa por un tiempo especificado.
   *
   * @param ms - Tiempo en milisegundos.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calcula el retraso de reintento utilizando la estrategia de exponencial backoff.
   *
   * @param attempt - Numero de intento actual.
   * @returns Tiempo de retraso en milisegundos.
   */
  private backoffDelayMs(attempt: number): number {
    const delay = this.baseDelayMs * Math.pow(2, attempt - 1);
    return Math.min(delay, this.maxDelayMs);
  }

  /**
   * Normaliza y extrae el mensaje de error de un objeto desconocido.
   *
   * @param error - Error capturado.
   * @returns Mensaje de error en minusculas.
   */
  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message.toLowerCase();
    }
    return String(error).toLowerCase();
  }

  /**
   * Comprueba si el error indica que una coleccion de Chroma no existe.
   *
   * @param error - Error capturado.
   * @returns True si corresponde a coleccion no encontrada.
   */
  private isCollectionNotFoundError(error: unknown): boolean {
    const msg = this.errorMessage(error);
    return msg.includes("not found") || msg.includes("does not exist") || msg.includes("404");
  }

  /**
   * Evalua si un error es temporal y susceptible de solucionarse mediante un reintento.
   *
   * @param error - Error capturado.
   * @returns True si el error es de red, timeout o conexion.
   */
  private isRetryableError(error: unknown): boolean {
    const msg = this.errorMessage(error);
    return (
      msg.includes("failed to connect") ||
      msg.includes("chroma connection") ||
      msg.includes("fetch") ||
      msg.includes("timeout") ||
      msg.includes("econnreset") ||
      msg.includes("enotfound") ||
      msg.includes("eai_again") ||
      msg.includes("socket") ||
      msg.includes("network")
    );
  }

  /**
   * Envuelve una accion asincrona con logica de reintentos y retroceso exponencial.
   *
   * @param operation - Nombre descriptivo de la operacion.
   * @param collectionName - Nombre de la coleccion afectada.
   * @param action - Funcion lambda asincrona a ejecutar.
   * @param options - Configuracion opcional (ej. ignorar si no existe).
   * @returns Resultado de la accion o undefined.
   */
  private async withRetry<T>(
    operation: string,
    collectionName: string,
    action: () => Promise<T>,
    options?: { ignoreNotFound?: boolean },
  ): Promise<T | undefined> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await action();
      } catch (error) {
        if (options?.ignoreNotFound && this.isCollectionNotFoundError(error)) {
          logger.debug("[RAG][ChromaRepository] operation:not-found", {
            operation,
            collectionName,
          });
          return undefined;
        }

        const retryable = this.isRetryableError(error);
        const isLastAttempt = attempt >= this.maxRetries;

        if (!retryable || isLastAttempt) {
          logger.error("[RAG][ChromaRepository] operation:failed", {
            operation,
            collectionName,
            attempt,
            maxAttempts: this.maxRetries,
            retryable,
            error,
          });
          throw error;
        }

        const delayMs = this.backoffDelayMs(attempt);
        logger.warn("[RAG][ChromaRepository] operation:retry", {
          operation,
          collectionName,
          attempt,
          maxAttempts: this.maxRetries,
          delayMs,
          error,
        });
        await this.sleep(delayMs);
      }
    }

    return undefined;
  }

  /**
   * Realiza una busqueda semantica en la coleccion de ChromaDB y devuelve el contexto
   * resultante formateado.
   * No interrumpe la ejecucion ni lanza excepcion si falla la conexion con el RAG, sino que
   * devuelve un string vacio y registra el error.
   *
   * @param query - Mensaje o pregunta de consulta.
   * @param collectionName - Nombre de la coleccion vectorial a interrogar.
   * @returns Fragmentos de texto plano recuperados y concatenados, o cadena vacia.
   */
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

  /**
   * Elimina por completo una coleccion de ChromaDB por su nombre.
   *
   * @param collectionName - Nombre de la coleccion a eliminar.
   */
  async deleteCollection(collectionName: string): Promise<void> {
    const cleanName = collectionName.replace(/"/g, "").trim();
    if (!cleanName) return;

    await this.withRetry(
      "deleteCollection",
      cleanName,
      async () => {
        await this.client.deleteCollection({ name: cleanName });
      },
      { ignoreNotFound: true },
    );

    logger.debug("[RAG][ChromaRepository] deleteCollection:success", {
      collectionName: cleanName,
    });
  }

  /**
   * Inserta o actualiza un lote de fragmentos documentales (chunks) en la coleccion indicada.
   * Si la coleccion no existia previamente, la crea.
   *
   * @param collectionName - Nombre de la coleccion vectorial.
   * @param chunks - Fragmentos de base de conocimientos estructurados a registrar.
   */
  async upsertDocuments(collectionName: string, chunks: KnowledgeBaseChunk[]): Promise<void> {
    const cleanName = collectionName.replace(/"/g, "").trim();

    if (!cleanName) {
      throw new Error("Collection name is required to upsert documents");
    }

    if (!chunks.length) {
      logger.warn("[RAG][ChromaRepository] upsertDocuments:empty-chunks", {
        collectionName: cleanName,
      });
      return;
    }

    await this.withRetry("upsertDocuments", cleanName, async () => {
      const collection = await this.client.getOrCreateCollection({
        name: cleanName,
        embeddingFunction: this.embedder,
      });

      await collection.upsert({
        ids: chunks.map((chunk) => chunk.id),
        documents: chunks.map((chunk) => chunk.text),
        metadatas: chunks.map((chunk) => chunk.metadata as any),
      });
    });

    logger.debug("[RAG][ChromaRepository] upsertDocuments:success", {
      collectionName: cleanName,
      chunkCount: chunks.length,
    });
  }
}