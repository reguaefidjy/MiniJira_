import { RequestHandler } from 'express';
import * as service from './metrics.service';
import type { TicketStatus } from '../../types';

const VALID_STATUSES = new Set<string>(['todo', 'in_progress', 'review', 'done']);
const DATE_RE        = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE        = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function parseMulti(raw: unknown): string[] {
  return ([] as string[])
    .concat(raw as string | string[] ?? [])
    .flatMap(v => v.split(',').map(s => s.trim()))
    .filter(Boolean);
}

function parseFilters(q: Record<string, unknown>) {
  const from        = (q['from'] as string | undefined) ?? firstDayOfMonthStr();
  const to          = (q['to']   as string | undefined) ?? todayStr();
  const assignee_id = q['assignee_id'] as string | undefined;
  const statusRaw   = parseMulti(q['status']);

  const errors: string[] = [];

  if (!DATE_RE.test(from)) errors.push('from must be YYYY-MM-DD');
  if (!DATE_RE.test(to))   errors.push('to must be YYYY-MM-DD');
  if (from > to)           errors.push('from cannot be after to');
  for (const s of statusRaw) if (!VALID_STATUSES.has(s)) errors.push(`Invalid status: "${s}"`);
  if (assignee_id && !UUID_RE.test(assignee_id)) errors.push('assignee_id must be a valid UUID');

  if (errors.length) {
    const code = from > to ? 'invalid_date_range' : 'invalid_input';
    return { ok: false as const, message: errors[0], code };
  }

  return {
    ok: true as const,
    filters: {
      from,
      to,
      assignee_id,
      status: statusRaw.length ? (statusRaw as TicketStatus[]) : undefined,
    },
  };
}

export const snapshot: RequestHandler = async (req, res, next) => {
  try {
    const parsed = parseFilters(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.code, message: parsed.message });
      return;
    }

    const result = await service.getSnapshot(parsed.filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const exportCsv: RequestHandler = async (req, res, next) => {
  try {
    const parsed = parseFilters(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.code, message: parsed.message });
      return;
    }

    await service.exportCsvStream(res, parsed.filters);
  } catch (err) {
    next(err);
  }
};
