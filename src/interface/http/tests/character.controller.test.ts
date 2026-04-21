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
  },
}));

describe("CharacterController", () => {
  let controller: InstanceType<typeof import("../character.controller.js").CharacterController>;
  let characterRepo: { findOne: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  let conversationRepo: { find: ReturnType<typeof vi.fn> };
  let messageRepo: { find: ReturnType<typeof vi.fn> };
  let galleryImageRepo: { find: ReturnType<typeof vi.fn> };
  let storage: IStorageService;
  let deleteFilesMock: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    const defaultRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    };

    characterRepo = {
      findOne: vi.fn(),
      delete: vi.fn(),
    };
    conversationRepo = {
      find: vi.fn(),
    };
    messageRepo = {
      find: vi.fn(),
    };
    galleryImageRepo = {
      find: vi.fn(),
    };

    getRepository.mockImplementation((entity: { name?: string }) => {
      switch (entity?.name) {
        case "Character":
          return characterRepo;
        case "Conversation":
          return conversationRepo;
        case "Message":
          return messageRepo;
        case "CharacterGalleryImage":
          return galleryImageRepo;
        default:
          return defaultRepo;
      }
    });

    const { CharacterController } = await import("../character.controller.js");
    deleteFilesMock = vi.fn(async () => undefined);
    storage = {
      deleteFiles: deleteFilesMock as IStorageService["deleteFiles"],
      getSignedUrl: vi.fn(async () => "https://signed.example/file.webp") as IStorageService["getSignedUrl"],
      uploadFile: vi.fn(async () => "uploaded/path") as IStorageService["uploadFile"],
    };
    controller = new CharacterController(storage);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    characterRepo.findOne.mockReset();
    characterRepo.delete.mockReset();
    conversationRepo.find.mockReset();
    messageRepo.find.mockReset();
    galleryImageRepo.find.mockReset();
    deleteFilesMock.mockReset();
  });

  function createResponse(): Response {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;
  }

  describe("destroy", () => {
    it("returns 401 when user is missing", async () => {
      const req = {
        params: { id: "character-1" },
        user: undefined,
      } as unknown as Request;
      const res = createResponse();

      await controller.destroy(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("returns 404 when character is not accessible", async () => {
      const req = {
        params: { id: "character-1" },
        user: { sub: "admin-user" },
      } as unknown as Request;
      const res = createResponse();

      characterRepo.findOne.mockResolvedValue(null);

      await controller.destroy(req, res);

      expect(characterRepo.findOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Personaje no encontrado" });
    });

    it("cleans storage and deletes the character when found", async () => {
      const req = {
        params: { id: "character-1" },
        user: { sub: "admin-user" },
      } as unknown as Request;
      const res = createResponse();

      characterRepo.findOne.mockResolvedValue({
        id: "character-1",
        imageUrl: "/characters/hero.webp",
        backgroundImageUrl: "characters/backgrounds/hero-bg.webp",
      });
      galleryImageRepo.find.mockResolvedValue([
        { id: "gallery-1", imageUrl: "gallery/hero-1.webp", characterId: "character-1" },
      ]);
      conversationRepo.find.mockResolvedValue([
        { id: "conversation-1" },
        { id: "conversation-2" },
      ]);
      messageRepo.find.mockResolvedValue([
        { id: 1, audioStorageId: "audio/assistant-1.mp3", audioPath: null },
        { id: 2, audioStorageId: null, audioPath: "audio/user-1.webm" },
      ]);
      deleteFilesMock.mockResolvedValue(undefined);
      characterRepo.delete.mockResolvedValue({ affected: 1 });

      await controller.destroy(req, res);

      expect(deleteFilesMock).toHaveBeenNthCalledWith(
        1,
        "characters",
        expect.arrayContaining(["characters/hero.webp", "hero.webp", "backgrounds/hero-bg.webp", "characters/backgrounds/hero-bg.webp", "gallery/hero-1.webp"]),
      );
      expect(deleteFilesMock).toHaveBeenNthCalledWith(
        2,
        "communications",
        expect.arrayContaining(["audio/assistant-1.mp3", "audio/user-1.webm"]),
      );
      expect(characterRepo.delete).toHaveBeenCalledWith({ id: "character-1" });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });
});