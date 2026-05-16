import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../config/env.js", () => ({
  env: {
    SUPABASE_URL: "https://test.supabase.co",
  },
}));

const { mockJwtVerify } = vi.hoisted(() => ({
  mockJwtVerify: vi.fn(),
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: mockJwtVerify,
  },
}));

vi.mock("jwks-rsa", () => ({
  default: vi.fn().mockReturnValue({
    getSigningKey: vi.fn(),
  }),
}));

import { SupabaseTokenVerifier } from "../SupabaseTokenVerifier.js";

describe("SupabaseTokenVerifier", () => {
  let verifier: SupabaseTokenVerifier;

  beforeEach(() => {
    vi.clearAllMocks();
    verifier = new SupabaseTokenVerifier();
  });

  describe("verifyToken", () => {
    it("resolves with decoded payload on a valid token", async () => {
      const decoded = { sub: "user-123", role: "authenticated" };
      mockJwtVerify.mockImplementation((_token: any, _keyFn: any, _opts: any, callback: any) => {
        callback(null, decoded);
      });

      const result = await verifier.verifyToken("valid.jwt.token");
      expect(result).toEqual(decoded);
    });

    it("rejects when jwt.verify calls back with an error", async () => {
      const error = new Error("invalid signature");
      mockJwtVerify.mockImplementation((_token: any, _keyFn: any, _opts: any, callback: any) => {
        callback(error, null);
      });

      await expect(verifier.verifyToken("bad.token")).rejects.toThrow("invalid signature");
    });

    it("rejects with expired token error", async () => {
      const expiredError = Object.assign(new Error("jwt expired"), { name: "TokenExpiredError" });
      mockJwtVerify.mockImplementation((_token: any, _keyFn: any, _opts: any, callback: any) => {
        callback(expiredError, null);
      });

      await expect(verifier.verifyToken("expired.jwt.token")).rejects.toThrow("jwt expired");
    });

    it("rejects with malformed token error", async () => {
      const malformedError = new Error("jwt malformed");
      mockJwtVerify.mockImplementation((_token: any, _keyFn: any, _opts: any, callback: any) => {
        callback(malformedError, null);
      });

      await expect(verifier.verifyToken("not.a.token")).rejects.toThrow("jwt malformed");
    });

    it("passes ES256 and HS256 algorithms and authenticated audience to jwt.verify", async () => {
      mockJwtVerify.mockImplementation((_token: any, _keyFn: any, opts: any, callback: any) => {
        callback(null, { sub: "user-1" });
      });

      await verifier.verifyToken("token");

      expect(mockJwtVerify).toHaveBeenCalledWith(
        "token",
        expect.any(Function),
        expect.objectContaining({
          algorithms: ["ES256", "HS256"],
          audience: "authenticated",
        }),
        expect.any(Function),
      );
    });

    it("constructs the JWKS URI from SUPABASE_URL env var", async () => {
      const jwksRsa = await import("jwks-rsa");
      expect(jwksRsa.default).toHaveBeenCalledWith(
        expect.objectContaining({
          jwksUri: "https://test.supabase.co/auth/v1/.well-known/jwks.json",
        }),
      );
    });

    it("the key callback passed to jwt.verify delegates to the JWKS client", async () => {
      let capturedKeyFn: (header: any, callback: any) => void = () => {};
      mockJwtVerify.mockImplementation((_token: any, keyFn: any, _opts: any, callback: any) => {
        capturedKeyFn = keyFn;
        callback(null, { sub: "u" });
      });

      await verifier.verifyToken("token");

      const jwksRsa = await import("jwks-rsa");
      const mockClient = (jwksRsa.default as any).mock.results[0].value;

      const nextCb = vi.fn();
      const mockKey = { getPublicKey: vi.fn().mockReturnValue("public-key-pem") };
      mockClient.getSigningKey.mockImplementation((_kid: any, cb: any) => cb(null, mockKey));

      capturedKeyFn({ kid: "key-id-1" }, nextCb);

      expect(mockClient.getSigningKey).toHaveBeenCalledWith("key-id-1", expect.any(Function));
      expect(nextCb).toHaveBeenCalledWith(null, "public-key-pem");
    });

    it("propagates JWKS client error through the key callback", async () => {
      let capturedKeyFn: (header: any, callback: any) => void = () => {};
      mockJwtVerify.mockImplementation((_token: any, keyFn: any, _opts: any, callback: any) => {
        capturedKeyFn = keyFn;
        callback(null, { sub: "u" });
      });

      await verifier.verifyToken("token");

      const jwksRsa = await import("jwks-rsa");
      const mockClient = (jwksRsa.default as any).mock.results[0].value;
      const jwksError = new Error("JWKS fetch failed");
      mockClient.getSigningKey.mockImplementation((_kid: any, cb: any) => cb(jwksError));

      const nextCb = vi.fn();
      capturedKeyFn({ kid: "bad-key" }, nextCb);

      expect(nextCb).toHaveBeenCalledWith(jwksError);
    });
  });
});
