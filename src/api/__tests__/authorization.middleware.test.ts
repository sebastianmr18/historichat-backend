import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";

const { mockFindOne, mockGetRepository } = vi.hoisted(() => {
  const mockFindOne = vi.fn();
  const mockGetRepository = vi.fn().mockReturnValue({ findOne: mockFindOne });
  return { mockFindOne, mockGetRepository };
});

vi.mock("../../config/database.js", () => ({
  AppDataSource: { getRepository: mockGetRepository },
}));

import { requireAdminRole } from "../authorization.middleware.js";

function mockReq(userId?: string): Partial<Request> {
  if (!userId) return {};
  return { user: { sub: userId } };
}

function mockRes(): {
  res: Partial<Response>;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
} {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status, json } as unknown as Partial<Response>, status, json };
}

describe("requireAdminRole", () => {
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it("returns 401 when req.user is missing", async () => {
    const { res, status, json } = mockRes();
    await requireAdminRole(mockReq() as Request, res as Response, next as NextFunction);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when user has admin role", async () => {
    mockFindOne.mockResolvedValue({ role: "admin" });
    const req = mockReq("user-admin-id");
    const { res } = mockRes();

    await requireAdminRole(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
    expect((req as any).userRole).toBe("admin");
  });

  it("returns 403 when user has role 'user'", async () => {
    mockFindOne.mockResolvedValue({ role: "user" });
    const { res, status, json } = mockRes();

    await requireAdminRole(mockReq("user-regular-id") as Request, res as Response, next as NextFunction);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Forbidden: admin role required." });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when profile has no role (defaults to user)", async () => {
    mockFindOne.mockResolvedValue({ role: null });
    const { res, status, json } = mockRes();

    await requireAdminRole(mockReq("user-no-role") as Request, res as Response, next as NextFunction);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Forbidden: admin role required." });
  });

  it("returns 403 when profile does not exist (null from DB)", async () => {
    mockFindOne.mockResolvedValue(null);
    const { res, status, json } = mockRes();

    await requireAdminRole(mockReq("nonexistent-user") as Request, res as Response, next as NextFunction);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Forbidden: admin role required." });
  });

  it("returns 500 when DB query throws", async () => {
    mockFindOne.mockRejectedValue(new Error("DB connection lost"));
    const { res, status, json } = mockRes();

    await requireAdminRole(mockReq("user-abc") as Request, res as Response, next as NextFunction);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Internal Server Error" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user has an unrecognized role string", async () => {
    mockFindOne.mockResolvedValue({ role: "superuser" });
    const { res, status, json } = mockRes();

    await requireAdminRole(mockReq("user-xyz") as Request, res as Response, next as NextFunction);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Forbidden: admin role required." });
  });
});
