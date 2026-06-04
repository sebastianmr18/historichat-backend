/**
 * @file ws-auth.middleware.ts
 * @description Middleware de Socket.io para validar el token JWT y autenticar las conexiones.
 */
import { JwtPayload } from "jsonwebtoken";
import { Socket } from "socket.io";
import { SupabaseTokenVerifier } from "../../infrastructure/auth/SupabaseTokenVerifier.js";

const verifier = new SupabaseTokenVerifier();

function extractUserIdFromJwt(decoded: string | JwtPayload): string | undefined {
  if (typeof decoded === "string") return undefined;
  if (typeof decoded.sub === "string") return decoded.sub;
  if (typeof (decoded as JwtPayload & { id?: string }).id === "string") {
    return (decoded as JwtPayload & { id?: string }).id;
  }
  return undefined;
}

export async function wsAuthMiddleware(socket: Socket, next: (err?: Error) => void): Promise<void> {
  const authToken =
    typeof socket.handshake.auth?.token === "string"
      ? socket.handshake.auth.token
      : undefined;
  const headerAuthorization =
    typeof socket.handshake.headers.authorization === "string"
      ? socket.handshake.headers.authorization
      : undefined;
  const bearerToken = headerAuthorization?.startsWith("Bearer ")
    ? headerAuthorization.slice(7)
    : undefined;

  const token = authToken ?? bearerToken;

  if (!token) return next(new Error("unauthorized"));

  try {
    const decoded = await verifier.verifyToken(token);
    const userId = extractUserIdFromJwt(decoded);

    if (!userId) return next(new Error("unauthorized"));

    socket.data.userId = userId;
    return next();
  } catch {
    return next(new Error("unauthorized"));
  }
}
