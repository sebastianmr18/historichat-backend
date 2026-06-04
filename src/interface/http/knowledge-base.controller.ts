/**
 * @file knowledge-base.controller.ts
 * @description Controlador HTTP para la carga y gestion de archivos en la base de conocimiento de los personajes.
 */
import { Request, RequestHandler, Response } from "express";
import multer from "multer";
import { AppDataSource } from "../../config/database.js";
import { env } from "../../config/env.js";
import { extractUserId } from "../../api/auth.utils.js";
import {
  KnowledgeBaseIngestionError,
  KnowledgeBaseIngestionService,
} from "../../application/services/knowledge-base-ingestion.service.js";
import { ChromaRepository } from "../../infrastructure/vector/chroma.repository.js";

const SUPPORTED_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "application/pdf",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.KB_UPLOAD_MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (SUPPORTED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    (req as Request & { uploadValidationError?: string }).uploadValidationError =
      "Solo se permiten archivos .txt, .md o .pdf.";
    cb(null, false);
  },
});

export const parseKnowledgeBaseUpload: RequestHandler = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        error: `El archivo supera el limite de ${env.KB_UPLOAD_MAX_FILE_SIZE_BYTES} bytes.`,
      });
      return;
    }

    res.status(400).json({
      error: "No se pudo procesar el archivo enviado.",
    });
  });
};

const ingestionService = new KnowledgeBaseIngestionService(
  AppDataSource,
  new ChromaRepository(),
  {
    chunkSize: env.KB_CHUNK_SIZE,
    chunkOverlap: env.KB_CHUNK_OVERLAP,
  },
);

export const uploadCharacterKnowledgeBase = async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const uploadValidationError = (req as Request & { uploadValidationError?: string }).uploadValidationError;
  if (uploadValidationError) {
    return res.status(415).json({ error: uploadValidationError });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "Debe enviar un archivo en el campo 'file'." });
  }

  const characterId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    const result = await ingestionService.uploadCharacterKnowledgeBase({
      characterId,
      userId,
      isAdmin: req.userRole === "admin",
      fileBuffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
    });

    return res.status(200).json({
      message: "Archivo indexado correctamente en la knowledge base.",
      ...result,
    });
  } catch (error) {
    if (error instanceof KnowledgeBaseIngestionError) {
      if (error.code === "CHARACTER_NOT_FOUND") {
        return res.status(404).json({ error: error.message });
      }

      if (error.code === "UNSUPPORTED_MIME") {
        return res.status(415).json({ error: error.message });
      }

      if (error.code === "EMPTY_FILE" || error.code === "EMPTY_TEXT") {
        return res.status(400).json({ error: error.message });
      }

      return res.status(500).json({ error: error.message });
    }

    return res.status(500).json({ error: "Error interno al indexar knowledge base." });
  }
};