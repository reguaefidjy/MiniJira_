import { RequestHandler } from 'express';
import * as service from './admin.service';
import type { UserRole } from '../../types';

const VALID_ROLES = new Set<string>(['admin', 'member']);
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validationError(message: string): Error {
  return Object.assign(new Error(message), { status: 400, code: 'invalid_input' });
}

export const createUser: RequestHandler = async (req, res, next) => {
  try {
    const b = req.body as Record<string, unknown>;

    if (!b.name || typeof b.name !== 'string' || !b.name.trim()) {
      return next(validationError('name is required and must be a non-empty string'));
    }
    if (!b.email || typeof b.email !== 'string' || !EMAIL_RE.test(b.email)) {
      return next(validationError('email is required and must be a valid email address'));
    }
    if (!b.role || !VALID_ROLES.has(b.role as string)) {
      return next(validationError('role is required and must be admin | member'));
    }

    const user = await service.provisionUser(
      b.name.trim(),
      b.email.toLowerCase().trim(),
      b.role as UserRole,
    );
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

export const updateUser: RequestHandler = async (req, res, next) => {
  try {
    const b = req.body as Record<string, unknown>;

    if (b.name !== undefined && (typeof b.name !== 'string' || !b.name.trim())) {
      return next(validationError('name must be a non-empty string'));
    }
    if (b.email !== undefined && (typeof b.email !== 'string' || !EMAIL_RE.test(b.email))) {
      return next(validationError('email must be a valid email address'));
    }
    if (b.role !== undefined && !VALID_ROLES.has(b.role as string)) {
      return next(validationError('role must be admin | member'));
    }

    const user = await service.updateUser(
      req.params['id'] as string,
      b.name  !== undefined ? (b.name  as string).trim()                  : undefined,
      b.email !== undefined ? (b.email as string).toLowerCase().trim()    : undefined,
      b.role  !== undefined ? (b.role  as UserRole)                       : undefined,
    );
    res.json(user);
  } catch (err) {
    next(err);
  }
};

export const deactivateUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await service.deactivateUser(req.params['id'] as string);
    res.json(user);
  } catch (err) {
    next(err);
  }
};
