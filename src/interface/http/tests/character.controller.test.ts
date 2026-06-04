import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import type { IStorageService } from "../../../shared/types.js";

const getRepository = vi.fn();

// Default repo used for all entities without a specific mock (editorial, etc.)
let defaultRepo: {
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

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
  let characterRepo: {
    findOne: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findAndCount: ReturnType<typeof vi.fn>;
  };
  let conversationRepo: { find: ReturnType<typeof vi.fn> };
  let messageRepo: { find: ReturnType<typeof vi.fn> };
  let galleryImageRepo: { find: ReturnType<typeof vi.fn> };
  let storage: IStorageService;
  let deleteFilesMock: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    defaultRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
      save: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    };

    characterRepo = {
      create: vi.fn((value) => value),
      save: vi.fn(),
      find: vi.fn(),
      findAndCount: vi.fn(),
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
    // Restore storage mocks cleared by vi.clearAllMocks()
    (storage.getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue("https://signed.example/file.webp");
    (storage.uploadFile as ReturnType<typeof vi.fn>).mockResolvedValue("uploaded/path");
    characterRepo.findOne.mockReset();
    characterRepo.delete.mockReset();
    characterRepo.create.mockReset();
    characterRepo.create.mockImplementation((value) => value);
    characterRepo.save.mockReset();
    characterRepo.find.mockReset();
    characterRepo.findAndCount.mockReset();
    conversationRepo.find.mockReset();
    messageRepo.find.mockReset();
    galleryImageRepo.find.mockReset();
    galleryImageRepo.find.mockResolvedValue([]);
    deleteFilesMock.mockReset();
    defaultRepo.find.mockReset();
    defaultRepo.find.mockResolvedValue([]);
    defaultRepo.findOne.mockReset();
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

  describe("create", () => {
    it("generates a unique publicSlug from the name when one is not provided", async () => {
      const req = {
        body: {
          name: "Simón Bolívar",
          role: "Libertador",
          biography: "Biografía",
        },
        user: { sub: "admin-user" },
      } as unknown as Request;
      const res = createResponse();

      characterRepo.findOne.mockResolvedValueOnce({ id: "existing-character", publicSlug: "simon-bolivar" }).mockResolvedValueOnce(null);
      characterRepo.save.mockImplementation(async (value) => ({
        id: "character-1",
        description: null,
        keyTraits: [],
        speechTics: [],
        vectorDbName: "",
        voiceId: null,
        themeColor: null,
        themeColorLight: null,
        years: null,
        category: null,
        epoch: null,
        quote: null,
        imageUrl: null,
        backgroundImageUrl: null,
        ambientLabel: null,
        contentVariant: null,
        badge: null,
        topics: [],
        isPublic: false,
        createdAt: new Date("2026-04-20T00:00:00.000Z"),
        ...value,
      }));

      await controller.create(req, res);

      expect(characterRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Simón Bolívar",
          publicSlug: "simon-bolivar-2",
          userId: "admin-user",
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ publicSlug: "simon-bolivar-2" }));
    });

    it("rejects an explicit publicSlug when it is already taken", async () => {
      const req = {
        body: {
          name: "Albert Einstein",
          publicSlug: "Albert Einstein",
          role: "Físico",
          biography: "Biografía",
        },
        user: { sub: "admin-user" },
      } as unknown as Request;
      const res = createResponse();

      characterRepo.findOne.mockResolvedValue({ id: "existing-character", publicSlug: "albert-einstein" });

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: "El slug publico ya existe" });
      expect(characterRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("getBySlug", () => {
    it("returns a public character resolved by normalized slug", async () => {
      const req = {
        params: { slug: "Sócrates" },
        user: { sub: "admin-user" },
      } as unknown as Request;
      const res = createResponse();

      characterRepo.findOne.mockResolvedValue({
        id: "character-1",
        name: "Sócrates",
        publicSlug: "socrates",
        role: "Filósofo",
        biography: "Biografía",
        description: null,
        keyTraits: [],
        speechTics: [],
        vectorDbName: "",
        voiceId: null,
        themeColor: null,
        themeColorLight: null,
        years: null,
        category: null,
        epoch: null,
        quote: null,
        imageUrl: null,
        backgroundImageUrl: null,
        ambientLabel: null,
        contentVariant: null,
        badge: null,
        topics: [],
        isPublic: true,
        createdAt: new Date("2026-04-20T00:00:00.000Z"),
        userId: null,
      });

      await controller.getBySlug(req, res);

      expect(characterRepo.findOne).toHaveBeenCalledWith({
        where: [{ publicSlug: "socrates", isPublic: true }, { publicSlug: "socrates", isPublic: false, userId: "admin-user" }],
      });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ publicSlug: "socrates" }));
    });
  });

  // ── getAll ────────────────────────────────────────────────────────────────

  describe("getAll", () => {
    it("returns list of accessible characters for authenticated user", async () => {
      const req = { user: { sub: "user-1" } } as unknown as Request;
      const res = createResponse();

      const chars = [
        { id: "c1", name: "Einstein", imageUrl: null, backgroundImageUrl: null, publicSlug: "einstein" },
      ];
      characterRepo.find.mockResolvedValue(chars);

      await controller.getAll(req, res);

      expect(characterRepo.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: "c1" })]),
      );
    });

    it("returns only public characters when no user is present", async () => {
      const req = { user: undefined } as unknown as Request;
      const res = createResponse();

      characterRepo.find.mockResolvedValue([]);

      await controller.getAll(req, res);

      expect(characterRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublic: true } }),
      );
    });

    it("returns 500 on repository error", async () => {
      const req = { user: { sub: "u" } } as unknown as Request;
      const res = createResponse();
      characterRepo.find.mockRejectedValue(new Error("DB error"));

      await controller.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getAllAdmin", () => {
    it("returns paginated list of all characters with default pagination", async () => {
      const req = { query: {} } as unknown as Request;
      const res = createResponse();

      characterRepo.findAndCount.mockResolvedValue([
        [{ id: "c1", name: "Einstein", imageUrl: null, backgroundImageUrl: null }],
        1,
      ]);

      await controller.getAllAdmin(req, res);

      expect(characterRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          order: { createdAt: "DESC" },
          skip: 0,
          take: 20,
        }),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ id: "c1" })]),
          total: 1,
          page: 1,
          limit: 20,
        }),
      );
    });

    it("applies filters and custom pagination", async () => {
      const req = {
        query: {
          page: "2",
          limit: "5",
          isPublic: "false",
          userId: "550e8400-e29b-41d4-a716-446655440000",
        },
      } as unknown as Request;
      const res = createResponse();

      characterRepo.findAndCount.mockResolvedValue([[], 0]);

      await controller.getAllAdmin(req, res);

      expect(characterRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublic: false, userId: "550e8400-e29b-41d4-a716-446655440000" },
          skip: 5,
          take: 5,
        }),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ total: 0, page: 2, limit: 5 }),
      );
    });

    it("returns 400 when query params are invalid", async () => {
      const req = { query: { limit: "999" } } as unknown as Request;
      const res = createResponse();

      await controller.getAllAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
      );
      expect(characterRepo.findAndCount).not.toHaveBeenCalled();
    });

    it("returns 500 on repository error", async () => {
      const req = { query: {} } as unknown as Request;
      const res = createResponse();

      characterRepo.findAndCount.mockRejectedValue(new Error("DB error"));

      await controller.getAllAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
    });
  });

  // ── getById ───────────────────────────────────────────────────────────────

  describe("getById", () => {
    it("returns 404 when character is not found", async () => {
      const req = { params: { id: "missing" }, user: { sub: "u" } } as unknown as Request;
      const res = createResponse();
      characterRepo.findOne.mockResolvedValue(null);

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Personaje no encontrado" });
    });

    it("returns character data on success", async () => {
      const req = { params: { id: "char-1" }, user: { sub: "user-1" } } as unknown as Request;
      const res = createResponse();

      characterRepo.findOne.mockResolvedValue({
        id: "char-1",
        name: "Einstein",
        publicSlug: "einstein",
        role: "Physicist",
        biography: "Bio",
        description: null,
        keyTraits: [],
        speechTics: [],
        vectorDbName: "",
        voiceId: null,
        themeColor: null,
        themeColorLight: null,
        years: null,
        category: null,
        epoch: null,
        quote: null,
        imageUrl: null,
        backgroundImageUrl: null,
        ambientLabel: null,
        contentVariant: null,
        badge: null,
        topics: [],
        isPublic: true,
        createdAt: new Date("2026-01-01"),
        userId: null,
      });

      await controller.getById(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: "char-1", name: "Einstein" }));
    });
  });

  // ── getBySlug additional cases ────────────────────────────────────────────

  describe("getBySlug – edge cases", () => {
    it("returns 404 when character is not found by slug", async () => {
      const req = { params: { slug: "unknown-slug" }, user: undefined } as unknown as Request;
      const res = createResponse();
      characterRepo.findOne.mockResolvedValue(null);

      await controller.getBySlug(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 404 when slug normalizes to empty string", async () => {
      const req = { params: { slug: "!!!" }, user: undefined } as unknown as Request;
      const res = createResponse();

      await controller.getBySlug(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ── updateVoiceId ─────────────────────────────────────────────────────────

  describe("updateVoiceId", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = { params: { id: "char-1" }, body: { voiceId: "en-US" }, user: undefined } as unknown as Request;
      const res = createResponse();

      await controller.updateVoiceId(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 404 when character is not found for owner", async () => {
      const req = { params: { id: "char-1" }, body: { voiceId: "en-US" }, user: { sub: "owner" } } as unknown as Request;
      const res = createResponse();
      characterRepo.findOne.mockResolvedValue(null);

      await controller.updateVoiceId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("saves and returns updated character with new voiceId", async () => {
      const req = {
        params: { id: "char-1" },
        body: { voiceId: "Kore" },
        user: { sub: "owner" },
      } as unknown as Request;
      const res = createResponse();

      const character = { id: "char-1", voiceId: "old-voice", userId: "owner" };
      characterRepo.findOne.mockResolvedValue(character);
      characterRepo.save.mockResolvedValue({ ...character, voiceId: "Kore" });

      await controller.updateVoiceId(req, res);

      expect(characterRepo.save).toHaveBeenCalledWith(expect.objectContaining({ voiceId: "Kore" }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ voiceId: "Kore" }));
    });
  });

  // ── getEditorialById ──────────────────────────────────────────────────────

  describe("getEditorialById", () => {
    it("returns 404 when character is not found", async () => {
      const req = { params: { id: "missing" }, user: { sub: "u" } } as unknown as Request;
      const res = createResponse();
      characterRepo.findOne.mockResolvedValue(null);

      await controller.getEditorialById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns editorial payload with empty arrays when no editorial data exists", async () => {
      const req = { params: { id: "char-1" }, user: { sub: "u" } } as unknown as Request;
      const res = createResponse();

      characterRepo.findOne.mockResolvedValue({
        id: "char-1",
        name: "Einstein",
        publicSlug: "einstein",
        role: "Physicist",
        biography: "Bio",
        description: null,
        keyTraits: [],
        speechTics: [],
        vectorDbName: "",
        voiceId: null,
        themeColor: null,
        themeColorLight: null,
        years: null,
        category: null,
        epoch: null,
        quote: null,
        imageUrl: null,
        backgroundImageUrl: null,
        ambientLabel: null,
        contentVariant: null,
        badge: null,
        topics: [],
        isPublic: true,
        createdAt: new Date("2026-01-01"),
        userId: null,
      });

      await controller.getEditorialById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          character: expect.objectContaining({ id: "char-1" }),
          editorial: expect.objectContaining({
            quotes: [],
            facts: [],
            relationships: [],
            galleryImages: [],
            editorialBlocks: [],
          }),
        }),
      );
    });
  });

  // ── getEditorialHeroById ──────────────────────────────────────────────────

  describe("getEditorialHeroById", () => {
    it("returns 404 when character is not found", async () => {
      const req = { params: { id: "missing" }, user: { sub: "u" } } as unknown as Request;
      const res = createResponse();
      characterRepo.findOne.mockResolvedValue(null);

      await controller.getEditorialHeroById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns hero payload with character and quotes", async () => {
      const req = { params: { id: "char-1" }, user: { sub: "u" } } as unknown as Request;
      const res = createResponse();

      characterRepo.findOne.mockResolvedValue({
        id: "char-1",
        name: "Einstein",
        publicSlug: "einstein",
        role: "Physicist",
        biography: "Bio",
        description: null,
        keyTraits: [],
        speechTics: [],
        vectorDbName: "",
        voiceId: null,
        themeColor: null,
        themeColorLight: null,
        years: null,
        category: null,
        epoch: null,
        quote: null,
        imageUrl: null,
        backgroundImageUrl: null,
        ambientLabel: null,
        contentVariant: null,
        badge: null,
        topics: [],
        isPublic: true,
        createdAt: new Date("2026-01-01"),
        userId: null,
      });

      await controller.getEditorialHeroById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          character: expect.objectContaining({ id: "char-1" }),
          editorial: expect.objectContaining({ quotes: [], uiCopies: [] }),
        }),
      );
    });
  });

  // ── getEditorialOverviewById ──────────────────────────────────────────────

  describe("getEditorialOverviewById", () => {
    it("returns 404 when character is not found", async () => {
      const req = { params: { id: "missing" }, user: { sub: "u" } } as unknown as Request;
      const res = createResponse();
      characterRepo.findOne.mockResolvedValue(null);

      await controller.getEditorialOverviewById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns overview payload with editorial data", async () => {
      const req = { params: { id: "char-1" }, user: { sub: "u" } } as unknown as Request;
      const res = createResponse();

      characterRepo.findOne.mockResolvedValue({ id: "char-1", contentVariant: null });

      await controller.getEditorialOverviewById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          editorial: expect.objectContaining({ facts: [], contextCards: [], editorialBlocks: [] }),
        }),
      );
    });
  });

  // ── getEditorialTimelineById ──────────────────────────────────────────────

  describe("getEditorialTimelineById", () => {
    it("returns 404 when character is not found", async () => {
      const req = { params: { id: "missing" }, user: { sub: "u" } } as unknown as Request;
      const res = createResponse();
      characterRepo.findOne.mockResolvedValue(null);

      await controller.getEditorialTimelineById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns timeline payload with sorted entries", async () => {
      const req = { params: { id: "char-1" }, user: { sub: "u" } } as unknown as Request;
      const res = createResponse();
      characterRepo.findOne.mockResolvedValue({ id: "char-1", contentVariant: null });

      await controller.getEditorialTimelineById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          editorial: expect.objectContaining({ timelineEntries: [] }),
        }),
      );
    });
  });

  // ── getEditorialRelationsById ─────────────────────────────────────────────

  describe("getEditorialRelationsById", () => {
    it("returns 404 when character is not found", async () => {
      const req = { params: { id: "missing" }, user: { sub: "u" } } as unknown as Request;
      const res = createResponse();
      characterRepo.findOne.mockResolvedValue(null);

      await controller.getEditorialRelationsById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns relations payload", async () => {
      const req = { params: { id: "char-1" }, user: { sub: "u" } } as unknown as Request;
      const res = createResponse();
      characterRepo.findOne.mockResolvedValue({ id: "char-1", contentVariant: null });

      await controller.getEditorialRelationsById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          editorial: expect.objectContaining({ relationships: [], prompts: [] }),
        }),
      );
    });
  });

  // ── getEditorialGalleryById ───────────────────────────────────────────────

  describe("getEditorialGalleryById", () => {
    it("returns 404 when character is not found", async () => {
      const req = { params: { id: "missing" }, user: { sub: "u" } } as unknown as Request;
      const res = createResponse();
      characterRepo.findOne.mockResolvedValue(null);

      await controller.getEditorialGalleryById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns gallery payload", async () => {
      const req = { params: { id: "char-1" }, user: { sub: "u" } } as unknown as Request;
      const res = createResponse();
      characterRepo.findOne.mockResolvedValue({ id: "char-1", contentVariant: null });
      galleryImageRepo.find.mockResolvedValue([]);

      await controller.getEditorialGalleryById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          editorial: expect.objectContaining({ galleryImages: [] }),
        }),
      );
    });
  });
});