import { Request, Response, NextFunction } from 'express';
import { SupabaseTokenVerifier } from '../infrastructure/auth/SupabaseTokenVerifier.js';

const verifier = new SupabaseTokenVerifier();

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifier.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};