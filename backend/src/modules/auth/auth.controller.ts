import { RequestHandler } from 'express';

export const callback: RequestHandler = async (_req, _res, next) => next();
export const refresh:  RequestHandler = async (_req, _res, next) => next();
export const logout:   RequestHandler = async (_req, _res, next) => next();
export const me:       RequestHandler = async (_req, _res, next) => next();
