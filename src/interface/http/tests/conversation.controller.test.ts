import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import type { IStorageService } from "../../../shared/types.js";

const getRepository = vi.fn();

vi.mock("../../../config/database.js", () => ({
  AppDataSource: {
    getRepository,
  },
}));

vi.mock("../../../infrastructure/logging/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../config/env.js", () => ({
  env: {
    SIGNED_URL_EXPIRES_SECONDS: 3600,
    SUPABASE_STORAGE_BUCKET: "communications",
    DEBATE_SKIP_CONFIDENCE_THRESHOLD: 0.75,
  },
}));

describe("ConversationController", () => {
  let controller: InstanceType<typeof import("../conversation.controller.js").ConversationController>;
  let conversationRepo: {
    find: ReturnType<typeof vi.fn>;
  };
  let storage: IStorageService;

  beforeAll(async () => {
    const defaultRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    };

    conversationRepo = {
      find: vi.fn(),
    };

    getRepository.mockImplementation((entity: { name?: string }) => {
      switch (entity?.name) {
        case "Conversation":
          return conversationRepo;
        default:
          return defaultRepo;
      }
    });

    const { ConversationController } = await import("../conversation.controller.js");
    storage = {
      deleteFiles: vi.fn(async () => undefined) as IStorageService["deleteFiles"],
      getSignedUrl: vi.fn(async () => "https://signed.example/audio.mp3") as IStorageService["getSignedUrl"],
      uploadFile: vi.fn(async () => "uploaded/path") as IStorageService["uploadFile"],
    };
    controller = new ConversationController(storage);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    conversationRepo.find.mockReset();
  });

  function createResponse(): Response {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;
  }

  describe("list", () => {
    it("lists authenticated user conversations without filters when character_id is absent", async () => {
      const req = {
        query: {},
        user: { sub: "user-1" },
      } as unknown as Request;
      const res = createResponse();

      conversationRepo.find.mockResolvedValue([
        {
          id: "conversation-1",
          userId: "user-1",
          createdAt: new Date("2026-04-20T10:00:00.000Z"),
          character: { id: "character-a", name: "Sherlock Holmes" },
          secondaryCharacter: null,
          secondaryCharacterId: null,
          messages: [],
        },
      ]);

      await controller.list(req, res);

      expect(conversationRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
        }),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "conversation-1",
            mode: "interview",
            primaryCharacter: expect.objectContaining({ id: "character-a" }),
            secondaryCharacter: null,
          }),
        ]),
      );
    });

    it("filters by character_id across primary and secondary characters", async () => {
      const req = {
        query: { character_id: "3ca1517f-be41-4e6f-8c99-1ba79a876075" },
        user: { sub: "user-1" },
      } as unknown as Request;
      const res = createResponse();

      conversationRepo.find.mockResolvedValue([
        {
          id: "conversation-1",
          userId: "user-1",
          createdAt: new Date("2026-04-20T10:00:00.000Z"),
          character: { id: "3ca1517f-be41-4e6f-8c99-1ba79a876075", name: "Sherlock Holmes" },
          secondaryCharacter: null,
          secondaryCharacterId: null,
          messages: [],
        },
        {
          id: "conversation-2",
          userId: "user-1",
          createdAt: new Date("2026-04-19T10:00:00.000Z"),
          character: { id: "cb99855c-9e7d-47ea-9dc7-7ac2f4f33f1a", name: "Arthur Conan Doyle" },
          secondaryCharacter: { id: "3ca1517f-be41-4e6f-8c99-1ba79a876075", name: "Sherlock Holmes" },
          secondaryCharacterId: "3ca1517f-be41-4e6f-8c99-1ba79a876075",
          messages: [],
        },
      ]);

      await controller.list(req, res);

      expect(conversationRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { userId: "user-1", character: { id: "3ca1517f-be41-4e6f-8c99-1ba79a876075" } },
            { userId: "user-1", secondaryCharacter: { id: "3ca1517f-be41-4e6f-8c99-1ba79a876075" } },
          ],
        }),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "conversation-1", mode: "interview" }),
          expect.objectContaining({ id: "conversation-2", mode: "debate" }),
        ]),
      );
    });

    it("returns 400 when character_id is not a valid UUID", async () => {
      const req = {
        query: { character_id: "not-a-uuid" },
        user: { sub: "user-1" },
      } as unknown as Request;
      const res = createResponse();

      await controller.list(req, res);

      expect(conversationRepo.find).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "character_id invalido" });
    });
  });
});