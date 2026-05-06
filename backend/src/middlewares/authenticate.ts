import { RequestHandler } from 'express';
import { verifyAccessToken } from '../lib/jwt';

export const authenticate: RequestHandler = (req, res, next) => {
  const token = req.cookies?.access_token as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
    return;
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
};
