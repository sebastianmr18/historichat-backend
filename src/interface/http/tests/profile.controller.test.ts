import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Request, Response } from "express";
import { ProfileController } from "../profile.controller.js";
import { AppDataSource } from "../../../config/database.js";
import { Profile } from "../../../infrastructure/database/entities/Profile.js";

describe("ProfileController", () => {
  let controller: ProfileController;

  beforeAll(() => {
    controller = new ProfileController();
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

      vi.spyOn(AppDataSource, "getRepository").mockReturnValue(mockRepository as any);

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

      vi.spyOn(AppDataSource, "getRepository").mockReturnValue(mockRepository as any);

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

      vi.spyOn(AppDataSource, "getRepository").mockReturnValue(mockRepository as any);

      await controller.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
    });
  });
});
