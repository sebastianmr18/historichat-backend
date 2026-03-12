import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { SupabaseTokenVerifier } from '../infrastructure/auth/SupabaseTokenVerifier.js';

const verifier = new SupabaseTokenVerifier();

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = await verifier.verifyToken(token); // AWAIT necesario
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

export function extractUserId(req: Request): string | undefined {
  if (!req.user) return undefined;
  if (typeof req.user === "string") return req.user;

  const payload = req.user as JwtPayload & { id?: string };
  return (typeof payload.sub === "string" ? payload.sub : undefined) ?? payload.id;
}