import { RequestHandler } from 'express';
import { UserRole } from '../types';

export const authorize = (...roles: UserRole[]): RequestHandler =>
  (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'forbidden', message: 'Insufficient permissions' });
      return;
    }
    next();
  };
