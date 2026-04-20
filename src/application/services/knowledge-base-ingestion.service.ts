import crypto from "crypto";
import { DataSource } from "typeorm";
import { PDFParse } from "pdf-parse";
import { Character } from "../../infrastructure/database/entities/Character.js";
import { ChromaRepository } from "../../infrastructure/vector/chroma.repository.js";
import { logger } from "../../infrastructure/logging/logger.js";
import {
  KnowledgeBaseChunk,
  KnowledgeBaseUploadInput,
  KnowledgeBaseUploadResult,
} from "../../domain/rag/knowledge-base.types.js";

export class KnowledgeBaseIngestionError extends Error {
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

interface KnowledgeBaseIngestionOptions {
  chunkSize: number;
  chunkOverlap: number;
}

const DEFAULT_OPTIONS: KnowledgeBaseIngestionOptions = {
  chunkSize: 1200,
  chunkOverlap: 150,
};

export class KnowledgeBaseIngestionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly chromaRepository: ChromaRepository,
    private readonly options: KnowledgeBaseIngestionOptions = DEFAULT_OPTIONS,
  ) {}

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

      const chunkHash = crypto.createHash("sha256").update(rawChunk).digest("hex").slice(0, 16);
      chunks.push({
        id: `${metadataBase.characterId}:${chunkHash}:${index}`,
        text: rawChunk,
        metadata: {
          ...metadataBase,
          chunkIndex: index,
        },
      });
    }

    return chunks;
  }
}