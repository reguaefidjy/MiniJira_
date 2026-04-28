import { RequestHandler } from 'express';

export const snapshot:  RequestHandler = async (_req, _res, next) => next();
export const exportCsv: RequestHandler = async (_req, _res, next) => next();
