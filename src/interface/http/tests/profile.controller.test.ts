import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import type { Request, Response } from "express";
import { Profile } from "../../../infrastructure/database/entities/Profile.js";

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

describe("ProfileController", () => {
  let controller: InstanceType<typeof import("../profile.controller.js").ProfileController>;

  beforeAll(async () => {
    const { ProfileController } = await import("../profile.controller.js");
    controller = new ProfileController();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMe", () => {
    it("should return 401 if userId is missing", async () => {
      const req = {
        user: undefined,
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      await controller.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("should return 404 if profile does not exist", async () => {
      const req = {
        user: { sub: "non-existent-id" },
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      // Mock AppDataSource to return null
      const mockRepository = {
        findOne: vi.fn().mockResolvedValue(null),
      };

      getRepository.mockReturnValue(mockRepository as any);

      await controller.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Profile not found" });
    });

    it("should return 200 with profile data if profile exists", async () => {
      const mockProfile: Partial<Profile> = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        username: "testuser",
        role: "admin",
        createdAt: new Date("2026-04-14"),
      };

      const req = {
        user: { sub: "123e4567-e89b-12d3-a456-426614174000" },
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const mockRepository = {
        findOne: vi.fn().mockResolvedValue(mockProfile),
      };

      getRepository.mockReturnValue(mockRepository as any);

      await controller.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "123e4567-e89b-12d3-a456-426614174000",
          username: "testuser",
          role: "admin",
        })
      );
    });

    it("should return 500 on database error", async () => {
      const req = {
        user: { sub: "123e4567-e89b-12d3-a456-426614174000" },
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const mockRepository = {
        findOne: vi.fn().mockRejectedValue(new Error("Database error")),
      };

      getRepository.mockReturnValue(mockRepository as any);

      await controller.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
    });
  });
});
