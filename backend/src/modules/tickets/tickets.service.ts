import { and, eq, isNull, inArray, gte, lte } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../../db';
import {
  tickets, ticketAssignees, ticketLabels, users, labels,
} from '../../db/schema';
import type { TicketStatus, TicketPriority, UserRole } from '../../types';

export interface ListFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  assignee_id?: string;
  label_id?: string;
  created_at_from?: string;
  created_at_to?: string;
}

export interface CreateTicketInput {
  title: string;
  description?: string | null;
  priority: TicketPriority;
  status?: TicketStatus;
  is_blocked?: boolean;
  assignee_ids?: string[];
  label_ids?: string[];
}

function apiError(message: string, status: number, code: string): Error {
  return Object.assign(new Error(message), { status, code });
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export async function listTickets(filters: ListFilters) {
  const conditions = [isNull(tickets.archived_at)];

  if (filters.status?.length)   conditions.push(inArray(tickets.status,   filters.status));
  if (filters.priority?.length) conditions.push(inArray(tickets.priority, filters.priority));
  if (filters.created_at_from)  conditions.push(gte(tickets.created_at, filters.created_at_from));
  if (filters.created_at_to)    conditions.push(lte(tickets.created_at, `${filters.created_at_to}T23:59:59Z`));

  // Subsets por assignee/label se resuelven en paralelo antes de filtrar tickets
  const [assigneeSubset, labelSubset] = await Promise.all([
    filters.assignee_id
      ? db.select({ ticket_id: ticketAssignees.ticket_id })
           .from(ticketAssignees)
           .where(eq(ticketAssignees.user_id, filters.assignee_id))
      : null,
    filters.label_id
      ? db.select({ ticket_id: ticketLabels.ticket_id })
           .from(ticketLabels)
           .where(eq(ticketLabels.label_id, filters.label_id))
      : null,
  ]);

  if (assigneeSubset !== null) {
    if (!assigneeSubset.length) return [];
    conditions.push(inArray(tickets.id, assigneeSubset.map(r => r.ticket_id)));
  }
  if (labelSubset !== null) {
    if (!labelSubset.length) return [];
    conditions.push(inArray(tickets.id, labelSubset.map(r => r.ticket_id)));
  }

  const rows = await db
    .select({
      ticket:  tickets,
      creator: { id: users.id, name: users.name, email: users.email },
    })
    .from(tickets)
    .innerJoin(users, eq(tickets.created_by, users.id))
    .where(and(...conditions));

  if (!rows.length) return [];

  const ids = rows.map(r => r.ticket.id);

  // Assignees y labels de todos los tickets en paralelo
  const [assigneeRows, labelRows] = await Promise.all([
    db
      .select({
        ticket_id: ticketAssignees.ticket_id,
        user: { id: users.id, name: users.name, email: users.email, role: users.role },
      })
      .from(ticketAssignees)
      .innerJoin(users, eq(ticketAssignees.user_id, users.id))
      .where(inArray(ticketAssignees.ticket_id, ids)),
    db
      .select({
        ticket_id: ticketLabels.ticket_id,
        label:     { id: labels.id, name: labels.name, color: labels.color },
      })
      .from(ticketLabels)
      .innerJoin(labels, eq(ticketLabels.label_id, labels.id))
      .where(inArray(ticketLabels.ticket_id, ids)),
  ]);

  const assigneeMap = groupBy(assigneeRows, r => r.ticket_id);
  const labelMap    = groupBy(labelRows,    r => r.ticket_id);

  return rows.map(({ ticket, creator }) => ({
    ...ticket,
    creator,
    assignees: (assigneeMap.get(ticket.id) ?? []).map(r => r.user),
    labels:    (labelMap.get(ticket.id)    ?? []).map(r => r.label),
  }));
}

export async function createTicket(input: CreateTicketInput, userId: string) {
  // Verifica que assignees y labels existan en paralelo antes de insertar
  const [assigneeCheck, labelCheck] = await Promise.all([
    input.assignee_ids?.length
      ? db.select({ id: users.id }).from(users)
           .where(inArray(users.id, input.assignee_ids))
      : Promise.resolve([] as { id: string }[]),
    input.label_ids?.length
      ? db.select({ id: labels.id }).from(labels)
           .where(inArray(labels.id, input.label_ids))
      : Promise.resolve([] as { id: string }[]),
  ]);

  if (input.assignee_ids?.length && assigneeCheck.length !== input.assignee_ids.length) {
    throw apiError('One or more assignee_ids not found', 400, 'invalid_input');
  }
  if (input.label_ids?.length && labelCheck.length !== input.label_ids.length) {
    throw apiError('One or more label_ids not found', 400, 'invalid_input');
  }

  const id  = randomUUID();
  const now = new Date().toISOString();

  await db.insert(tickets).values({
    id,
    title:       input.title,
    description: input.description ?? null,
    priority:    input.priority,
    status:      input.status ?? 'todo',
    is_blocked:  input.is_blocked ?? false,
    created_by:  userId,
    version:     1,
    created_at:  now,
    updated_at:  now,
  });

  // Junction rows en paralelo
  await Promise.all([
    input.assignee_ids?.length
      ? db.insert(ticketAssignees).values(
          input.assignee_ids.map(user_id => ({ ticket_id: id, user_id }))
        )
      : Promise.resolve(),
    input.label_ids?.length
      ? db.insert(ticketLabels).values(
          input.label_ids.map(label_id => ({ ticket_id: id, label_id }))
        )
      : Promise.resolve(),
  ]);

  // Devuelve el ticket creado con relaciones — ticket+creator y assignees+labels en paralelo
  const [ticketRows, [assigneeRows, labelRows]] = await Promise.all([
    db
      .select({
        ticket:  tickets,
        creator: { id: users.id, name: users.name, email: users.email, role: users.role },
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.created_by, users.id))
      .where(eq(tickets.id, id)),
    Promise.all([
      db
        .select({ user: { id: users.id, name: users.name, email: users.email, role: users.role } })
        .from(ticketAssignees)
        .innerJoin(users, eq(ticketAssignees.user_id, users.id))
        .where(eq(ticketAssignees.ticket_id, id)),
      db
        .select({ label: { id: labels.id, name: labels.name, color: labels.color } })
        .from(ticketLabels)
        .innerJoin(labels, eq(ticketLabels.label_id, labels.id))
        .where(eq(ticketLabels.ticket_id, id)),
    ]),
  ]);

  const { ticket, creator } = ticketRows[0];
  return {
    ...ticket,
    creator,
    assignees: assigneeRows.map(r => r.user),
    labels:    labelRows.map(r => r.label),
  };
}

// Tabla de transiciones válidas
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  todo:        ['in_progress'],
  in_progress: ['todo', 'review'],
  review:      ['in_progress', 'done'],
  done:        ['review'],
};

// Helper reutilizable: carga ticket con relaciones (sin filtrar archived_at)
async function loadTicketWithRelations(id: string) {
  const rows = await db
    .select({
      ticket:  tickets,
      creator: { id: users.id, name: users.name, email: users.email, role: users.role },
    })
    .from(tickets)
    .innerJoin(users, eq(tickets.created_by, users.id))
    .where(eq(tickets.id, id));

  if (!rows.length) return null;

  const [assigneeRows, labelRows] = await Promise.all([
    db
      .select({ user: { id: users.id, name: users.name, email: users.email, role: users.role } })
      .from(ticketAssignees)
      .innerJoin(users, eq(ticketAssignees.user_id, users.id))
      .where(eq(ticketAssignees.ticket_id, id)),
    db
      .select({ label: { id: labels.id, name: labels.name, color: labels.color } })
      .from(ticketLabels)
      .innerJoin(labels, eq(ticketLabels.label_id, labels.id))
      .where(eq(ticketLabels.ticket_id, id)),
  ]);

  const { ticket, creator } = rows[0];
  return {
    ...ticket,
    creator,
    assignees: assigneeRows.map(r => r.user),
    labels:    labelRows.map(r => r.label),
  };
}

export async function getTicketById(id: string, role: UserRole) {
  const ticket = await loadTicketWithRelations(id);

  if (!ticket) {
    throw apiError('Ticket not found', 404, 'not_found');
  }
  // Los members no pueden ver tickets archivados
  if (ticket.archived_at && role !== 'admin') {
    throw apiError('Ticket not found', 404, 'not_found');
  }

  return ticket;
}

async function replaceAssignees(ticketId: string, assigneeIds: string[]): Promise<void> {
  await db.delete(ticketAssignees).where(eq(ticketAssignees.ticket_id, ticketId));
  if (assigneeIds.length) {
    await db.insert(ticketAssignees).values(assigneeIds.map(user_id => ({ ticket_id: ticketId, user_id })));
  }
}

async function replaceLabels(ticketId: string, labelIds: string[]): Promise<void> {
  await db.delete(ticketLabels).where(eq(ticketLabels.ticket_id, ticketId));
  if (labelIds.length) {
    await db.insert(ticketLabels).values(labelIds.map(label_id => ({ ticket_id: ticketId, label_id })));
  }
}

export interface UpdateTicketInput {
  title?:        string;
  description?:  string | null;
  priority?:     TicketPriority;
  status?:       TicketStatus;
  is_blocked?:   boolean;
  assignee_ids?: string[];
  label_ids?:    string[];
  version:       number;
}

export async function updateTicket(
  id: string,
  input: UpdateTicketInput,
  userId: string,
  role: UserRole,
) {
  const [current] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, id), isNull(tickets.archived_at)));

  if (!current) {
    throw apiError('Ticket not found', 404, 'not_found');
  }

  if (role !== 'admin' && current.created_by !== userId) {
    throw apiError('You can only edit your own tickets', 403, 'forbidden');
  }

  if (current.version !== input.version) {
    throw apiError(
      'Ticket was modified by another user — reload and retry',
      409,
      'version_conflict',
    );
  }

  if (input.status && input.status !== current.status) {
    const allowed = VALID_TRANSITIONS[current.status];
    if (!allowed.includes(input.status)) {
      throw apiError(
        `Transition from "${current.status}" to "${input.status}" is not allowed`,
        422,
        'invalid_transition',
      );
    }
    // Transición done → review solo para admin
    if (current.status === 'done' && role !== 'admin') {
      throw apiError('Only admins can move a ticket out of done', 403, 'forbidden');
    }
  }

  // Verificar existencia de assignees y labels si se proporcionan
  const [assigneeCheck, labelCheck] = await Promise.all([
    input.assignee_ids?.length
      ? db.select({ id: users.id }).from(users).where(inArray(users.id, input.assignee_ids))
      : Promise.resolve([] as { id: string }[]),
    input.label_ids?.length
      ? db.select({ id: labels.id }).from(labels).where(inArray(labels.id, input.label_ids))
      : Promise.resolve([] as { id: string }[]),
  ]);

  if (input.assignee_ids?.length && assigneeCheck.length !== input.assignee_ids.length) {
    throw apiError('One or more assignee_ids not found', 400, 'invalid_input');
  }
  if (input.label_ids?.length && labelCheck.length !== input.label_ids.length) {
    throw apiError('One or more label_ids not found', 400, 'invalid_input');
  }

  const now = new Date().toISOString();

  await db
    .update(tickets)
    .set({
      ...(input.title       !== undefined && { title:       input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.priority    !== undefined && { priority:    input.priority }),
      ...(input.status      !== undefined && { status:      input.status }),
      ...(input.is_blocked  !== undefined && { is_blocked:  input.is_blocked }),
      version:    current.version + 1,
      updated_at: now,
    })
    .where(eq(tickets.id, id));

  // Reemplazar relaciones solo si se enviaron explícitamente
  await Promise.all([
    input.assignee_ids !== undefined
      ? replaceAssignees(id, input.assignee_ids)
      : Promise.resolve(),
    input.label_ids !== undefined
      ? replaceLabels(id, input.label_ids)
      : Promise.resolve(),
  ]);

  return loadTicketWithRelations(id);
}

export async function archiveTicket(id: string, userId: string, role: UserRole) {
  const [current] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, id), isNull(tickets.archived_at)));

  if (!current) {
    throw apiError('Ticket not found', 404, 'not_found');
  }

  if (role !== 'admin' && current.created_by !== userId) {
    throw apiError('You can only archive your own tickets', 403, 'forbidden');
  }

  const now = new Date().toISOString();
  await db
    .update(tickets)
    .set({ archived_at: now, updated_at: now })
    .where(eq(tickets.id, id));

  return loadTicketWithRelations(id);
}
