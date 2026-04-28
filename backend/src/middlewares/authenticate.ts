import { RequestHandler } from 'express';
// TODO: verify JWT from httpOnly cookie and attach req.user
export const authenticate: RequestHandler = (_req, _res, next) => next();
