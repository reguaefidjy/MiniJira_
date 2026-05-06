import { RequestHandler } from 'express';
import * as service from './users.service';

export const list: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await service.listUsers());
  } catch (err) {
    next(err);
  }
};
