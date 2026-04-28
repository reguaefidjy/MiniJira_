import { RequestHandler } from 'express';
import { UserRole } from '../types';
// TODO: check req.user.role against required roles
export const authorize = (..._roles: UserRole[]): RequestHandler =>
  (_req, _res, next) => next();
