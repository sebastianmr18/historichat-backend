/**
 * @file knowledge-base-ingestion.service.ts
 * @description Servicio encargado de la ingesta de archivos de base de conocimientos.
 * Lee archivos de texto, markdown o PDF, los divide en fragmentos (chunks) y los indexa
 * en la base de datos vectorial ChromaDB tras aplicar sanitizaciones de seguridad.
 */

import crypto from "crypto";
import { DataSource } from "typeorm";
import { PDFParse } from "pdf-parse";
import { Character } from "../../infrastructure/database/entities/Character.js";
import { ChromaRepository } from "../../infrastructure/vector/chroma.repository.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { sanitizeRagChunk } from "../prompts/prompt-field-sanitizer.js";
import {
  KnowledgeBaseChunk,
  KnowledgeBaseUploadInput,
  KnowledgeBaseUploadResult,
} from "../../domain/rag/knowledge-base.types.js";

/**
 * Excepcion personalizada para los errores surgidos durante el proceso de ingesta
 * de la base de conocimientos.
 */
export class KnowledgeBaseIngestionError extends Error {
  /**
   * Crea una instancia de KnowledgeBaseIngestionError.
   *
   * @param code - Codigo del tipo de error especifico.
   * @param message - Mensaje descriptivo detallado del error.
   */
  constructor(
    public readonly code:
      | "CHARACTER_NOT_FOUND"
      | "EMPTY_FILE"
      | "EMPTY_TEXT"
      | "UNSUPPORTED_MIME"
      | "INGESTION_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "KnowledgeBaseIngestionError";
  }
}

/**
 * Opciones de configuracion interna para la generacion de fragmentos (chunking) de texto.
 */
interface KnowledgeBaseIngestionOptions {
  /** Tamano maximo en caracteres de cada fragmento. */
  chunkSize: number;
  /** Cantidad de caracteres superpuestos entre fragmentos adyacentes para no perder contexto. */
  chunkOverlap: number;
}

/**
 * Opciones por defecto para la division de textos.
 */
const DEFAULT_OPTIONS: KnowledgeBaseIngestionOptions = {
  chunkSize: 1200,
  chunkOverlap: 150,
};

/**
 * Servicio que gestiona la ingesta de documentos para la base de conocimientos RAG.
 */
export class KnowledgeBaseIngestionService {
  /**
   * Crea una instancia de KnowledgeBaseIngestionService.
   *
   * @param dataSource - Conexion a la base de datos relacional para validar los permisos y buscar personajes.
   * @param chromaRepository - Repositorio para la insercion e indexacion en la base vectorial.
   * @param options - Configuracion del tamano y solapamiento de los fragmentos (opcional).
   */
  constructor(
    private readonly dataSource: DataSource,
    private readonly chromaRepository: ChromaRepository,
    private readonly options: KnowledgeBaseIngestionOptions = DEFAULT_OPTIONS,
  ) {}

  /**
   * Sube un archivo a la base de conocimientos de un personaje.
   * Valida permisos, extrae el texto del archivo (soporta TXT, MD y PDF), lo fragmenta,
   * y guarda el resultado en el almacen vectorial indexado ChromaDB.
   *
   * @param input - Parametros de entrada con los datos del archivo y el usuario solicitante.
   * @returns Resumen de los datos de indexacion e informacion del archivo.
   * @throws KnowledgeBaseIngestionError si el archivo esta vacio, no tiene permisos, no es soportado o falla la indexacion.
   */
  async uploadCharacterKnowledgeBase(input: KnowledgeBaseUploadInput): Promise<KnowledgeBaseUploadResult> {
    if (!input.fileBuffer.length) {
      throw new KnowledgeBaseIngestionError("EMPTY_FILE", "El archivo esta vacio.");
    }

    const characterRepo = this.dataSource.getRepository(Character);
    const whereClause = input.isAdmin
      ? ({ id: input.characterId as any } as any)
      : ([
          { id: input.characterId as any, userId: input.userId },
          { id: input.characterId as any, isPublic: true },
        ] as any);

    const character = await characterRepo.findOne({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        vectorDbName: true,
        isPublic: true,
      },
    });

    if (!character) {
      throw new KnowledgeBaseIngestionError(
        "CHARACTER_NOT_FOUND",
        "Personaje no encontrado o sin permisos.",
      );
    }

    const parsedText = await this.parseFileText(input.fileBuffer, input.mimeType);
    const cleanText = parsedText.replace(/\u0000/g, "").trim();

    if (!cleanText) {
      throw new KnowledgeBaseIngestionError(
        "EMPTY_TEXT",
        "No se encontro texto util en el archivo.",
      );
    }

    const collectionName = (character.vectorDbName || character.id).replace(/"/g, "").trim();
    const indexedAt = new Date().toISOString();
    const chunks = this.buildChunks(cleanText, {
      characterId: character.id,
      userId: input.userId,
      sourceFileName: input.fileName,
      mimeType: input.mimeType,
      uploadedAt: indexedAt,
    });

    if (!chunks.length) {
      throw new KnowledgeBaseIngestionError(
        "EMPTY_TEXT",
        "No se pudo construir contenido indexable desde el archivo.",
      );
    }

    try {
      await this.chromaRepository.upsertDocuments(collectionName, chunks);
      logger.info("[kb.ingestion] upload_success", {
        characterId: character.id,
        collectionName,
        chunksIndexed: chunks.length,
        mimeType: input.mimeType,
        fileName: input.fileName,
      });
    } catch (error) {
      logger.error("[kb.ingestion] upload_failed", {
        characterId: character.id,
        collectionName,
        mimeType: input.mimeType,
        fileName: input.fileName,
        error,
      });
      throw new KnowledgeBaseIngestionError(
        "INGESTION_FAILED",
        "No se pudo indexar el archivo en la base vectorial.",
      );
    }

    return {
      characterId: character.id,
      collectionName,
      fileName: input.fileName,
      mimeType: input.mimeType,
      chunksIndexed: chunks.length,
      indexedAt,
    };
  }

  /**
   * Extrae el contenido de texto plano de un archivo segun su tipo MIME.
   * Soporta archivos de texto plano, markdown y documentos PDF.
   *
   * @param fileBuffer - Buffer binario del archivo.
   * @param mimeType - Tipo MIME del archivo.
   * @returns Cadena con el texto plano extraido.
   * @throws KnowledgeBaseIngestionError si el tipo MIME no esta soportado.
   */
  private async parseFileText(fileBuffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === "text/plain" || mimeType === "text/markdown") {
      return fileBuffer.toString("utf8");
    }

    if (mimeType === "application/pdf") {
      const parser = new PDFParse({ data: fileBuffer });
      try {
        const pdfResult = await parser.getText();
        return pdfResult.text ?? "";
      } finally {
        await parser.destroy();
      }
    }

    throw new KnowledgeBaseIngestionError(
      "UNSUPPORTED_MIME",
      "Tipo de archivo no soportado para knowledge base.",
    );
  }

  /**
   * Divide un texto completo en multiples fragmentos estructurados aplicando sanitizacion.
   *
   * @param text - Texto limpio extraido del archivo.
   * @param metadataBase - Metadatos base a adjuntar a cada fragmento.
   * @returns Lista de fragmentos estructurados con sus respectivos identificadores.
   */
  private buildChunks(
    text: string,
    metadataBase: {
      characterId: string;
      userId: string;
      sourceFileName: string;
      mimeType: string;
      uploadedAt: string;
    },
  ): KnowledgeBaseChunk[] {
    const chunkSize = Math.max(200, this.options.chunkSize);
    const chunkOverlap = Math.max(0, Math.min(this.options.chunkOverlap, chunkSize - 1));
    const step = Math.max(1, chunkSize - chunkOverlap);

    const chunks: KnowledgeBaseChunk[] = [];
    for (let start = 0, index = 0; start < text.length; start += step, index += 1) {
      const rawChunk = text.slice(start, start + chunkSize).trim();
      if (!rawChunk) {
        continue;
      }

      const { text: chunkText, flagged } = sanitizeRagChunk(rawChunk);

      if (flagged) {
        logger.warn("[security] rag_chunk_flagged", {
          characterId: metadataBase.characterId,
          fileName: metadataBase.sourceFileName,
          chunkIndex: index,
          preview: rawChunk.slice(0, 100),
        });
      }

      const chunkHash = crypto.createHash("sha256").update(chunkText).digest("hex").slice(0, 16);
      chunks.push({
        id: `${metadataBase.characterId}:${chunkHash}:${index}`,
        text: chunkText,
        metadata: {
          ...metadataBase,
          chunkIndex: index,
          flagged,
        },
      });
    }

    return chunks;
  }
}