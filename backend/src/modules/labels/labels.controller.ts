import { RequestHandler } from 'express';
import * as service from './labels.service';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/;

function validationError(message: string): Error {
  return Object.assign(new Error(message), { status: 400, code: 'invalid_input' });
}

export const list: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await service.listLabels());
  } catch (err) {
    next(err);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const b = req.body as Record<string, unknown>;

    if (!b.name || typeof b.name !== 'string' || !b.name.trim()) {
      return next(validationError('name is required and must be a non-empty string'));
    }
    if (!b.color || typeof b.color !== 'string' || !HEX_COLOR_RE.test(b.color)) {
      return next(validationError('color is required and must be a valid hex color (#RGB or #RRGGBB)'));
    }

    const label = await service.createLabel(b.name.trim(), b.color);
    res.status(201).json(label);
  } catch (err) {
    next(err);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const b = req.body as Record<string, unknown>;

    if (b.name !== undefined && (typeof b.name !== 'string' || !b.name.trim())) {
      return next(validationError('name must be a non-empty string'));
    }
    if (b.color !== undefined && (typeof b.color !== 'string' || !HEX_COLOR_RE.test(b.color))) {
      return next(validationError('color must be a valid hex color (#RGB or #RRGGBB)'));
    }

    const label = await service.updateLabel(
      req.params['id'] as string,
      b.name  !== undefined ? (b.name as string).trim() : undefined,
      b.color !== undefined ? (b.color as string)       : undefined,
    );
    res.json(label);
  } catch (err) {
    next(err);
  }
};

export const remove: RequestHandler = async (req, res, next) => {
  try {
    await service.deleteLabel(req.params['id'] as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
