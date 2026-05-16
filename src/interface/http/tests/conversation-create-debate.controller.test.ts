import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import type { IStorageService } from "../../../shared/types.js";

const getRepository = vi.fn();

vi.mock("../../../config/database.js", () => ({
  AppDataSource: { getRepository },
}));

vi.mock("../../../infrastructure/logging/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../config/env.js", () => ({
  env: {
    SIGNED_URL_EXPIRES_SECONDS: 3600,
    SUPABASE_STORAGE_BUCKET: "communications",
    DEBATE_SKIP_CONFIDENCE_THRESHOLD: 0.75,
  },
}));

const CHARACTER_A = { id: "char-a-uuid", name: "Ada Lovelace", isPublic: true };
const CHARACTER_B = { id: "char-b-uuid", name: "Alan Turing", isPublic: true };

describe("ConversationController.createDebate", () => {
  let controller: InstanceType<typeof import("../conversation.controller.js").ConversationController>;
  let characterRepo: { findOne: ReturnType<typeof vi.fn> };
  let conversationRepo: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let storage: IStorageService;

  beforeAll(async () => {
    characterRepo = { findOne: vi.fn() };
    conversationRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      delete: vi.fn(),
    };

    getRepository.mockImplementation((entity: { name?: string }) => {
      if (entity?.name === "Character") return characterRepo;
      if (entity?.name === "Conversation") return conversationRepo;
      return { findOne: vi.fn(), find: vi.fn(), save: vi.fn(), create: vi.fn(), delete: vi.fn() };
    });

    const { ConversationController } = await import("../conversation.controller.js");
    storage = {
      deleteFiles: vi.fn(async () => undefined) as IStorageService["deleteFiles"],
      getSignedUrl: vi.fn(async () => "https://signed.url/audio.mp3") as IStorageService["getSignedUrl"],
      uploadFile: vi.fn(async () => "uploaded/path") as IStorageService["uploadFile"],
    };
    controller = new ConversationController(storage);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockRes(): Response {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;
  }

  function mockReq(body: Record<string, unknown>, userId = "user-123"): Request {
    return { body, user: { sub: userId } } as unknown as Request;
  }

  function setupSuccessfulDebateCreation(savedId = "new-conv-id") {
    characterRepo.findOne
      .mockResolvedValueOnce(CHARACTER_A)
      .mockResolvedValueOnce(CHARACTER_B);
    const savedConversation = { id: savedId };
    conversationRepo.create.mockReturnValue(savedConversation);
    conversationRepo.save.mockResolvedValue(savedConversation);
    const persistedConversation = {
      id: savedId,
      character: CHARACTER_A,
      secondaryCharacter: CHARACTER_B,
      secondaryCharacterId: CHARACTER_B.id,
      debateTurnMode: "auto_alternate",
      preferredOpeningSpeakerId: CHARACTER_A.id,
      nextSpeakerId: CHARACTER_A.id,
      lastForcedSpeakerId: null,
      debateSettings: { autoSkipEnabled: true, confidenceThreshold: 0.75 },
      userId: "user-123",
      messages: [],
    };
    conversationRepo.findOne.mockResolvedValue(persistedConversation);
    return persistedConversation;
  }

  it("returns 401 when user is not authenticated", async () => {
    const req = { body: { characterIdA: "a", characterIdB: "b" } } as unknown as Request;
    const res = mockRes();
    await controller.createDebate(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Usuario no autenticado" });
  });

  it("returns 400 when characterIdA is missing", async () => {
    const res = mockRes();
    await controller.createDebate(mockReq({ characterIdB: CHARACTER_B.id }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "characterIdA y characterIdB son requeridos" });
  });

  it("returns 400 when characterIdB is missing", async () => {
    const res = mockRes();
    await controller.createDebate(mockReq({ characterIdA: CHARACTER_A.id }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "characterIdA y characterIdB son requeridos" });
  });

  it("returns 400 when characterIdA and characterIdB are the same", async () => {
    const res = mockRes();
    await controller.createDebate(mockReq({ characterIdA: "same-id", characterIdB: "same-id" }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "characterIdA y characterIdB deben ser distintos" });
  });

  it("returns 400 when turnMode has an invalid value", async () => {
    const res = mockRes();
    await controller.createDebate(
      mockReq({ characterIdA: CHARACTER_A.id, characterIdB: CHARACTER_B.id, turnMode: "invalid_mode" }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "turnMode debe ser auto_alternate o manual" });
  });

  it("returns 404 when characterA is not found or not accessible", async () => {
    characterRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(CHARACTER_B);
    const res = mockRes();
    await controller.createDebate(
      mockReq({ characterIdA: "nonexistent-a", characterIdB: CHARACTER_B.id }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Uno o ambos personajes no fueron encontrados o no son accesibles",
    });
  });

  it("returns 404 when characterB is not found or not accessible", async () => {
    characterRepo.findOne.mockResolvedValueOnce(CHARACTER_A).mockResolvedValueOnce(null);
    const res = mockRes();
    await controller.createDebate(
      mockReq({ characterIdA: CHARACTER_A.id, characterIdB: "nonexistent-b" }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 400 when preferredOpeningSpeakerId does not belong to either character", async () => {
    characterRepo.findOne
      .mockResolvedValueOnce(CHARACTER_A)
      .mockResolvedValueOnce(CHARACTER_B);
    const res = mockRes();
    await controller.createDebate(
      mockReq({
        characterIdA: CHARACTER_A.id,
        characterIdB: CHARACTER_B.id,
        preferredOpeningSpeakerId: "some-other-char-id",
      }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "preferredOpeningSpeakerId debe pertenecer a characterIdA o characterIdB",
    });
  });

  it("creates debate conversation with default auto_alternate turnMode when not specified", async () => {
    const persisted = setupSuccessfulDebateCreation();
    const res = mockRes();

    await controller.createDebate(
      mockReq({ characterIdA: CHARACTER_A.id, characterIdB: CHARACTER_B.id }),
      res
    );

    expect(conversationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        debateTurnMode: "auto_alternate",
        preferredOpeningSpeakerId: CHARACTER_A.id,
        nextSpeakerId: CHARACTER_A.id,
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: persisted.id }));
  });

  it("creates debate with manual turnMode when specified", async () => {
    setupSuccessfulDebateCreation();
    const res = mockRes();

    await controller.createDebate(
      mockReq({ characterIdA: CHARACTER_A.id, characterIdB: CHARACTER_B.id, turnMode: "manual" }),
      res
    );

    expect(conversationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ debateTurnMode: "manual" })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("uses preferredOpeningSpeakerId as opening speaker when it belongs to characterB", async () => {
    characterRepo.findOne
      .mockResolvedValueOnce(CHARACTER_A)
      .mockResolvedValueOnce(CHARACTER_B);
    conversationRepo.create.mockReturnValue({ id: "conv-2" });
    conversationRepo.save.mockResolvedValue({ id: "conv-2" });
    conversationRepo.findOne.mockResolvedValue({
      id: "conv-2",
      character: CHARACTER_A,
      secondaryCharacter: CHARACTER_B,
      secondaryCharacterId: CHARACTER_B.id,
      debateTurnMode: "auto_alternate",
      preferredOpeningSpeakerId: CHARACTER_B.id,
      nextSpeakerId: CHARACTER_B.id,
      lastForcedSpeakerId: null,
      debateSettings: {},
      userId: "user-123",
      messages: [],
    });

    const res = mockRes();
    await controller.createDebate(
      mockReq({
        characterIdA: CHARACTER_A.id,
        characterIdB: CHARACTER_B.id,
        preferredOpeningSpeakerId: CHARACTER_B.id,
      }),
      res
    );

    expect(conversationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        preferredOpeningSpeakerId: CHARACTER_B.id,
        nextSpeakerId: CHARACTER_B.id,
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns 500 when conversation cannot be retrieved after save", async () => {
    characterRepo.findOne
      .mockResolvedValueOnce(CHARACTER_A)
      .mockResolvedValueOnce(CHARACTER_B);
    conversationRepo.create.mockReturnValue({ id: "conv-3" });
    conversationRepo.save.mockResolvedValue({ id: "conv-3" });
    conversationRepo.findOne.mockResolvedValue(null);

    const res = mockRes();
    await controller.createDebate(
      mockReq({ characterIdA: CHARACTER_A.id, characterIdB: CHARACTER_B.id }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "No se pudo recuperar la conversación creada" });
  });

  it("returns 500 when DB throws during character lookup", async () => {
    characterRepo.findOne.mockRejectedValue(new Error("DB timeout"));
    const res = mockRes();
    await controller.createDebate(
      mockReq({ characterIdA: CHARACTER_A.id, characterIdB: CHARACTER_B.id }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error al crear la conversación de debate" });
  });
});
