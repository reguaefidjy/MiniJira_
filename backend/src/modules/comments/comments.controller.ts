import { RequestHandler } from 'express';
import * as service from './comments.service';

const MAX_BODY_LENGTH = 5_000;

function validationError(message: string): Error {
  return Object.assign(new Error(message), { status: 400, code: 'invalid_input' });
}

export const list: RequestHandler = async (req, res, next) => {
  try {
    const result = await service.listComments(req.params['id'] as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
      return;
    }

    const { body: commentBody } = req.body as { body?: unknown };

    if (!commentBody || typeof commentBody !== 'string' || !commentBody.trim()) {
      return next(validationError('body is required and must be a non-empty string'));
    }
    if (commentBody.length > MAX_BODY_LENGTH) {
      return next(validationError(`body must not exceed ${MAX_BODY_LENGTH} characters`));
    }

    const result = await service.createComment(
      req.params['id'] as string,
      req.user.sub,
      commentBody.trim(),
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const archive: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
      return;
    }

    const result = await service.archiveComment(
      req.params['id'] as string,
      req.user.sub,
      req.user.role,
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};
