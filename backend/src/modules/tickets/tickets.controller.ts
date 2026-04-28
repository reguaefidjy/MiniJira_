import { RequestHandler } from 'express';
import * as service from './tickets.service';
import type { TicketStatus, TicketPriority } from '../../types';

const VALID_STATUSES   = new Set<string>(['todo', 'in_progress', 'review', 'done']);
const VALID_PRIORITIES = new Set<string>(['low', 'medium', 'high']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validationError(message: string): Error {
  return Object.assign(new Error(message), { status: 400, code: 'invalid_input' });
}

// Normaliza ?foo=a&foo=b o ?foo=a,b en string[]
function parseMulti(raw: unknown): string[] {
  return ([] as string[])
    .concat(raw as string | string[] ?? [])
    .flatMap(v => v.split(',').map(s => s.trim()))
    .filter(Boolean);
}

export const list: RequestHandler = async (req, res, next) => {
  try {
    const q = req.query;

    const status   = parseMulti(q.status);
    const priority = parseMulti(q.priority);

    for (const s of status)   if (!VALID_STATUSES.has(s))   return next(validationError(`Invalid status: "${s}"`));
    for (const p of priority) if (!VALID_PRIORITIES.has(p)) return next(validationError(`Invalid priority: "${p}"`));

    const assignee_id     = q.assignee_id     as string | undefined;
    const label_id        = q.label_id        as string | undefined;
    const created_at_from = q.created_at_from as string | undefined;
    const created_at_to   = q.created_at_to   as string | undefined;

    if (assignee_id     && !UUID_RE.test(assignee_id))           return next(validationError('assignee_id must be a valid UUID'));
    if (label_id        && !UUID_RE.test(label_id))              return next(validationError('label_id must be a valid UUID'));
    if (created_at_from && !DATE_RE.test(created_at_from))       return next(validationError('created_at_from must be YYYY-MM-DD'));
    if (created_at_to   && !DATE_RE.test(created_at_to))         return next(validationError('created_at_to must be YYYY-MM-DD'));
    if (created_at_from && created_at_to && created_at_from > created_at_to) {
      return next(Object.assign(new Error('created_at_from cannot be after created_at_to'), { status: 400, code: 'invalid_date_range' }));
    }

    const result = await service.listTickets({
      status:         status.length   ? status   as TicketStatus[]   : undefined,
      priority:       priority.length ? priority as TicketPriority[] : undefined,
      assignee_id,
      label_id,
      created_at_from,
      created_at_to,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const b = req.body as Record<string, unknown>;

    if (typeof b.title !== 'string' || !b.title.trim()) {
      return next(validationError('title is required and must be a non-empty string'));
    }
    if (b.title.trim().length > 120) {
      return next(validationError('title must not exceed 120 characters'));
    }
    if (b.description !== undefined && b.description !== null && typeof b.description !== 'string') {
      return next(validationError('description must be a string or null'));
    }
    if (!b.priority || !VALID_PRIORITIES.has(b.priority as string)) {
      return next(validationError('priority is required and must be low | medium | high'));
    }
    if (b.status !== undefined && !VALID_STATUSES.has(b.status as string)) {
      return next(validationError('status must be todo | in_progress | review | done'));
    }
    if (b.is_blocked !== undefined && typeof b.is_blocked !== 'boolean') {
      return next(validationError('is_blocked must be a boolean'));
    }
    if (b.assignee_ids !== undefined) {
      if (!Array.isArray(b.assignee_ids) || b.assignee_ids.some(id => typeof id !== 'string' || !UUID_RE.test(id))) {
        return next(validationError('assignee_ids must be an array of UUIDs'));
      }
    }
    if (b.label_ids !== undefined) {
      if (!Array.isArray(b.label_ids) || b.label_ids.some(id => typeof id !== 'string' || !UUID_RE.test(id))) {
        return next(validationError('label_ids must be an array of UUIDs'));
      }
    }

    const ticket = await service.createTicket(
      {
        title:        b.title.trim(),
        description:  b.description as string | null | undefined,
        priority:     b.priority    as TicketPriority,
        status:       b.status      as TicketStatus | undefined,
        is_blocked:   b.is_blocked  as boolean | undefined,
        assignee_ids: b.assignee_ids as string[] | undefined,
        label_ids:    b.label_ids    as string[] | undefined,
      },
      req.user!.sub,
    );

    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
};

export const getOne:  RequestHandler = async (_req, _res, next) => next();
export const update:  RequestHandler = async (_req, _res, next) => next();
export const archive: RequestHandler = async (_req, _res, next) => next();
