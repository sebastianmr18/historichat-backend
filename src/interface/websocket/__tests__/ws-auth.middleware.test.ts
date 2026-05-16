import { describe, it, expect, vi, beforeEach } from "vitest";
import { Socket } from "socket.io";

const { mockVerifyToken } = vi.hoisted(() => ({ mockVerifyToken: vi.fn() }));

vi.mock("../../../infrastructure/auth/SupabaseTokenVerifier.js", () => ({
  SupabaseTokenVerifier: vi.fn().mockImplementation(function () {
    return { verifyToken: mockVerifyToken };
  }),
}));

import { wsAuthMiddleware } from "../ws-auth.middleware.js";

function mockSocket(options: {
  authToken?: string;
  headerAuthorization?: string;
}): Partial<Socket> & { data: Record<string, unknown> } {
  return {
    data: {},
    handshake: {
      auth: options.authToken !== undefined ? { token: options.authToken } : {},
      headers: options.headerAuthorization !== undefined
        ? { authorization: options.headerAuthorization }
        : {},
      // Required by Socket.io types but not used in middleware
      time: "",
      address: "",
      xdomain: false,
      secure: false,
      issued: 0,
      url: "",
      query: {},
    } as any,
  };
}

describe("wsAuthMiddleware", () => {
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it("calls next with 'unauthorized' error when no token is provided", async () => {
    const socket = mockSocket({});
    await wsAuthMiddleware(socket as unknown as Socket, next);
    expect(next).toHaveBeenCalledWith(new Error("unauthorized"));
  });

  it("authenticates via auth.token handshake field", async () => {
    const decoded = { sub: "user-ws-123" };
    mockVerifyToken.mockResolvedValue(decoded);
    const socket = mockSocket({ authToken: "valid-ws-token" });

    await wsAuthMiddleware(socket as unknown as Socket, next);

    expect(socket.data.userId).toBe("user-ws-123");
    expect(next).toHaveBeenCalledWith();
  });

  it("authenticates via Authorization Bearer header", async () => {
    const decoded = { sub: "user-header-456" };
    mockVerifyToken.mockResolvedValue(decoded);
    const socket = mockSocket({ headerAuthorization: "Bearer header-token" });

    await wsAuthMiddleware(socket as unknown as Socket, next);

    expect(socket.data.userId).toBe("user-header-456");
    expect(next).toHaveBeenCalledWith();
  });

  it("prefers auth.token over Authorization header when both present", async () => {
    const decoded = { sub: "user-auth-field" };
    mockVerifyToken.mockResolvedValue(decoded);
    const socket = mockSocket({
      authToken: "auth-field-token",
      headerAuthorization: "Bearer header-token",
    });

    await wsAuthMiddleware(socket as unknown as Socket, next);

    expect(mockVerifyToken).toHaveBeenCalledWith("auth-field-token");
    expect(socket.data.userId).toBe("user-auth-field");
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next with error when token verification fails", async () => {
    mockVerifyToken.mockRejectedValue(new Error("jwt malformed"));
    const socket = mockSocket({ authToken: "bad-token" });

    await wsAuthMiddleware(socket as unknown as Socket, next);

    expect(next).toHaveBeenCalledWith(new Error("unauthorized"));
    expect(socket.data.userId).toBeUndefined();
  });

  it("calls next with error when decoded payload has no userId (string payload)", async () => {
    mockVerifyToken.mockResolvedValue("plain-string-payload");
    const socket = mockSocket({ authToken: "token-string-payload" });

    await wsAuthMiddleware(socket as unknown as Socket, next);

    expect(next).toHaveBeenCalledWith(new Error("unauthorized"));
    expect(socket.data.userId).toBeUndefined();
  });

  it("extracts userId from 'id' field when 'sub' is absent", async () => {
    const decoded = { id: "user-id-field-789" };
    mockVerifyToken.mockResolvedValue(decoded);
    const socket = mockSocket({ authToken: "token-with-id-field" });

    await wsAuthMiddleware(socket as unknown as Socket, next);

    expect(socket.data.userId).toBe("user-id-field-789");
    expect(next).toHaveBeenCalledWith();
  });

  it("ignores non-string Authorization header (not Bearer)", async () => {
    mockVerifyToken.mockResolvedValue({ sub: "user-abc" });
    const socket = mockSocket({ headerAuthorization: "Token non-bearer-scheme" });

    // Non-Bearer header gets ignored → no token → error
    await wsAuthMiddleware(socket as unknown as Socket, next);

    expect(next).toHaveBeenCalledWith(new Error("unauthorized"));
  });
});
