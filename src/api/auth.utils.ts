import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export function extractUserId(req: Request): string | undefined {
  if (!req.user) return undefined;
  if (typeof req.user === 'string') return req.user;

  const payload = req.user as JwtPayload & { id?: string };
  return (typeof payload.sub === 'string' ? payload.sub : undefined) ?? payload.id;
}