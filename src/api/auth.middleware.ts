import { Request, Response, NextFunction } from 'express';
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