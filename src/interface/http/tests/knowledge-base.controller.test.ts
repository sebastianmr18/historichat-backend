import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

// ── Env & infra mocks (must be set before module import) ──────────────────────

vi.mock("../../../config/env.js", () => ({
  env: {
    KB_UPLOAD_MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
    KB_CHUNK_SIZE: 1200,
    KB_CHUNK_OVERLAP: 150,
  },
}));

vi.mock("../../../config/database.js", () => ({
  AppDataSource: {},
}));

vi.mock("../../../infrastructure/vector/chroma.repository.js", () => ({
  ChromaRepository: vi.fn().mockImplementation(function (this: any) {}),
}));

vi.mock("../../../infrastructure/logging/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── KnowledgeBaseIngestionService mock ───────────────────────────────────────

const { MockIngestionError, mockUploadKB } = vi.hoisted(() => {
  const mockUploadKB = vi.fn();

  class MockIngestionError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = "KnowledgeBaseIngestionError";
    }
  }

  return { MockIngestionError, mockUploadKB };
});

vi.mock("../../../application/services/knowledge-base-ingestion.service.js", () => ({
  KnowledgeBaseIngestionService: vi.fn().mockImplementation(function (this: any) {
    this.uploadCharacterKnowledgeBase = mockUploadKB;
  }),
  KnowledgeBaseIngestionError: MockIngestionError,
}));

// ── auth.utils mock ───────────────────────────────────────────────────────────

const { mockExtractUserId } = vi.hoisted(() => ({
  mockExtractUserId: vi.fn(),
}));

vi.mock("../../../api/auth.utils.js", () => ({
  extractUserId: mockExtractUserId,
}));

// ── multer mock – makes upload.single() call next() immediately ──────────────

vi.mock("multer", () => {
  const multerMock: any = vi.fn().mockReturnValue({
    single: vi.fn().mockReturnValue(
      vi.fn().mockImplementation((_req: any, _res: any, next: any) => next()),
    ),
  });
  multerMock.memoryStorage = vi.fn().mockReturnValue({});
  multerMock.MulterError = class MulterError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  };
  return { default: multerMock };
});

// ── Import the handler under test ─────────────────────────────────────────────

import { uploadCharacterKnowledgeBase } from "../knowledge-base.controller.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function createRequest(
  overrides: Partial<{
    params: any;
    file: Express.Multer.File;
    uploadValidationError: string;
    userRole: string;
  }> = {},
): Request {
  return {
    params: { id: "char-1" },
    file: {
      buffer: Buffer.from("text content"),
      originalname: "doc.txt",
      mimetype: "text/plain",
      fieldname: "file",
      encoding: "7bit",
      size: 12,
    } as Express.Multer.File,
    userRole: undefined,
    ...overrides,
  } as unknown as Request;
}

function createResponse(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("uploadCharacterKnowledgeBase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when userId cannot be extracted", async () => {
    mockExtractUserId.mockReturnValue(undefined);
    const res = createResponse();

    await uploadCharacterKnowledgeBase(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("returns 415 when uploadValidationError is set (unsupported mime type)", async () => {
    mockExtractUserId.mockReturnValue("user-1");
    const res = createResponse();
    const req = createRequest({ uploadValidationError: "Solo se permiten archivos .txt, .md o .pdf." } as any);

    await uploadCharacterKnowledgeBase(req, res);

    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({ error: "Solo se permiten archivos .txt, .md o .pdf." });
  });

  it("returns 400 when no file is attached", async () => {
    mockExtractUserId.mockReturnValue("user-1");
    const res = createResponse();
    const req = createRequest({ file: undefined } as any);

    await uploadCharacterKnowledgeBase(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Debe enviar un archivo en el campo 'file'." });
  });

  it("returns 200 with result on successful ingestion", async () => {
    mockExtractUserId.mockReturnValue("user-1");
    mockUploadKB.mockResolvedValue({ chunksIndexed: 5, collectionName: "char_doc" });
    const res = createResponse();

    await uploadCharacterKnowledgeBase(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Archivo indexado correctamente en la knowledge base.",
        chunksIndexed: 5,
      }),
    );
  });

  it("passes isAdmin=true when userRole is admin", async () => {
    mockExtractUserId.mockReturnValue("admin-user");
    mockUploadKB.mockResolvedValue({ chunksIndexed: 3, collectionName: "db" });
    const req = createRequest({ userRole: "admin" } as any);
    const res = createResponse();

    await uploadCharacterKnowledgeBase(req, res);

    expect(mockUploadKB).toHaveBeenCalledWith(
      expect.objectContaining({ isAdmin: true, userId: "admin-user" }),
    );
  });

  it("returns 404 on CHARACTER_NOT_FOUND ingestion error", async () => {
    mockExtractUserId.mockReturnValue("user-1");
    mockUploadKB.mockRejectedValue(new MockIngestionError("CHARACTER_NOT_FOUND", "Character not found"));
    const res = createResponse();

    await uploadCharacterKnowledgeBase(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Character not found" });
  });

  it("returns 415 on UNSUPPORTED_MIME ingestion error", async () => {
    mockExtractUserId.mockReturnValue("user-1");
    mockUploadKB.mockRejectedValue(new MockIngestionError("UNSUPPORTED_MIME", "Mime type not supported"));
    const res = createResponse();

    await uploadCharacterKnowledgeBase(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({ error: "Mime type not supported" });
  });

  it("returns 400 on EMPTY_FILE ingestion error", async () => {
    mockExtractUserId.mockReturnValue("user-1");
    mockUploadKB.mockRejectedValue(new MockIngestionError("EMPTY_FILE", "El archivo esta vacio."));
    const res = createResponse();

    await uploadCharacterKnowledgeBase(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "El archivo esta vacio." });
  });

  it("returns 400 on EMPTY_TEXT ingestion error", async () => {
    mockExtractUserId.mockReturnValue("user-1");
    mockUploadKB.mockRejectedValue(new MockIngestionError("EMPTY_TEXT", "No extractable text found."));
    const res = createResponse();

    await uploadCharacterKnowledgeBase(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 500 on generic KnowledgeBaseIngestionError", async () => {
    mockExtractUserId.mockReturnValue("user-1");
    mockUploadKB.mockRejectedValue(new MockIngestionError("INGESTION_FAILED", "Internal ingestion error"));
    const res = createResponse();

    await uploadCharacterKnowledgeBase(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal ingestion error" });
  });

  it("returns 500 on unexpected non-ingestion error", async () => {
    mockExtractUserId.mockReturnValue("user-1");
    mockUploadKB.mockRejectedValue(new Error("Database connection lost"));
    const res = createResponse();

    await uploadCharacterKnowledgeBase(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error interno al indexar knowledge base." });
  });
});
