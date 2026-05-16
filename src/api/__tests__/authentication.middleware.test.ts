import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";

const { mockVerifyToken } = vi.hoisted(() => ({ mockVerifyToken: vi.fn() }));

vi.mock("../../infrastructure/auth/SupabaseTokenVerifier.js", () => ({
  SupabaseTokenVerifier: vi.fn().mockImplementation(function () {
    return { verifyToken: mockVerifyToken };
  }),
}));

import { requireAuthentication } from "../authentication.middleware.js";

function mockReq(authHeader?: string): Partial<Request> {
  return { headers: authHeader ? { authorization: authHeader } : {} };
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

describe("requireAuthentication", () => {
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const { res, status, json } = mockRes();
    await requireAuthentication(mockReq() as Request, res as Response, next as NextFunction);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: "Missing token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header uses non-Bearer scheme", async () => {
    const { res, status, json } = mockRes();
    await requireAuthentication(mockReq("Basic dXNlcjpwYXNz") as Request, res as Response, next as NextFunction);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: "Missing token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next and attaches decoded payload to req.user when token is valid", async () => {
    const decoded = { sub: "user-123", email: "user@test.com" };
    mockVerifyToken.mockResolvedValue(decoded);
    const req = mockReq("Bearer valid-token");
    const { res } = mockRes();

    await requireAuthentication(req as Request, res as Response, next as NextFunction);

    expect((req as any).user).toEqual(decoded);
    expect(next).toHaveBeenCalledWith();
  });

  it("returns 401 when token verification throws (expired token)", async () => {
    mockVerifyToken.mockRejectedValue(new Error("jwt expired"));
    const { res, status, json } = mockRes();
    await requireAuthentication(mockReq("Bearer expired") as Request, res as Response, next as NextFunction);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token verification throws (invalid signature)", async () => {
    mockVerifyToken.mockRejectedValue(new Error("invalid signature"));
    const { res, status, json } = mockRes();
    await requireAuthentication(mockReq("Bearer tampered") as Request, res as Response, next as NextFunction);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });
});
