import { and, count, eq, gte, inArray, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import type { Response } from 'express';
import { db } from '../../db';
import { labels, ticketAssignees, ticketLabels, tickets, users } from '../../db/schema';
import { csvRow, startCsvStream } from '../../lib/csv';
import type { TicketStatus } from '../../types';

export interface MetricFilters {
  from?:        string;
  to?:          string;
  status?:      TicketStatus[];
  assignee_id?: string;
}

// Devuelve IDs de tickets asignados a un usuario concreto (vacío = ninguno)
async function ticketIdsForAssignee(assigneeId: string): Promise<string[]> {
  const rows = await db
    .select({ ticket_id: ticketAssignees.ticket_id })
    .from(ticketAssignees)
    .where(eq(ticketAssignees.user_id, assigneeId));
  return rows.map(r => r.ticket_id);
}

// Construye condiciones base para tickets no archivados con filtros de fecha/status
function activeConditions(filters: MetricFilters, ticketIds?: string[]) {
  const conds = [isNull(tickets.archived_at)];
  if (filters.from)          conds.push(gte(tickets.created_at, filters.from));
  if (filters.to)            conds.push(lte(tickets.created_at, `${filters.to}T23:59:59Z`));
  if (filters.status?.length) conds.push(inArray(tickets.status, filters.status));
  if (ticketIds?.length)     conds.push(inArray(tickets.id, ticketIds));
  return conds;
}

// Construye condiciones para tickets archivados (para closed_by_month)
function archivedConditions(filters: MetricFilters, ticketIds?: string[]) {
  const conds = [isNotNull(tickets.archived_at)];
  if (filters.from)      conds.push(gte(tickets.archived_at, filters.from));
  if (filters.to)        conds.push(lte(tickets.archived_at, `${filters.to}T23:59:59Z`));
  if (ticketIds?.length) conds.push(inArray(tickets.id, ticketIds));
  return conds;
}

export async function getSnapshot(filters: MetricFilters) {
  // Resolver filtro por asignado: si no hay tickets, devolver todo en cero
  let filteredIds: string[] | undefined;
  if (filters.assignee_id) {
    filteredIds = await ticketIdsForAssignee(filters.assignee_id);
    if (!filteredIds.length) {
      return {
        tickets_by_status:       { todo: 0, in_progress: 0, review: 0, done: 0 },
        tickets_closed_by_month: [],
        tickets_by_member:       [],
        total:                   0,
      };
    }
  }

  const [statusRows, closedRows, assignedRows, activeUsers] = await Promise.all([
    // tickets_by_status
    db
      .select({ status: tickets.status, count: count() })
      .from(tickets)
      .where(and(...activeConditions(filters, filteredIds)))
      .groupBy(tickets.status),

    // tickets_closed_by_month
    db
      .select({
        month: sql<string>`strftime('%Y-%m', ${tickets.archived_at})`,
        count: count(),
      })
      .from(tickets)
      .where(and(...archivedConditions(filters, filteredIds)))
      .groupBy(sql`strftime('%Y-%m', ${tickets.archived_at})`)
      .orderBy(sql`strftime('%Y-%m', ${tickets.archived_at})`),

    // pares asignado→ticket para contar por miembro (sin filtro de asignado ni status)
    db
      .select({ user_id: ticketAssignees.user_id })
      .from(ticketAssignees)
      .innerJoin(
        tickets,
        and(eq(tickets.id, ticketAssignees.ticket_id), isNull(tickets.archived_at)),
      ),

    // usuarios activos para tickets_by_member
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.is_active, true)),
  ]);

  const ticketsByStatus: Record<string, number> = { todo: 0, in_progress: 0, review: 0, done: 0 };
  for (const row of statusRows) {
    ticketsByStatus[row.status] = row.count;
  }

  const total = Object.values(ticketsByStatus).reduce((a, b) => a + b, 0);

  const countByUser = new Map<string, number>();
  for (const { user_id } of assignedRows) {
    countByUser.set(user_id, (countByUser.get(user_id) ?? 0) + 1);
  }

  const ticketsByMember = activeUsers
    .map(u => ({ user: { id: u.id, name: u.name }, active_count: countByUser.get(u.id) ?? 0 }))
    .sort((a, b) => b.active_count - a.active_count);

  return {
    tickets_by_status:       ticketsByStatus,
    tickets_closed_by_month: closedRows,
    tickets_by_member:       ticketsByMember,
    total,
  };
}

export async function exportCsvStream(res: Response, filters: MetricFilters): Promise<void> {
  const month = (filters.from ?? new Date().toISOString().slice(0, 7)).slice(0, 7);
  startCsvStream(res, `minijira-metrics-${month}.csv`);

  // Cabecera
  res.write(csvRow([
    'ticket_id', 'title', 'status', 'priority',
    'assignees', 'labels', 'created_by',
    'created_at', 'closed_at', 'archived',
  ]));

  // Obtener todos los tickets dentro del rango (activos + archivados)
  let filteredIds: string[] | undefined;
  if (filters.assignee_id) {
    filteredIds = await ticketIdsForAssignee(filters.assignee_id);
    if (!filteredIds.length) {
      res.end();
      return;
    }
  }

  const conditions = [];
  if (filters.from)           conditions.push(gte(tickets.created_at, filters.from));
  if (filters.to)             conditions.push(lte(tickets.created_at, `${filters.to}T23:59:59Z`));
  if (filters.status?.length) conditions.push(inArray(tickets.status, filters.status));
  if (filteredIds?.length)    conditions.push(inArray(tickets.id, filteredIds));

  const ticketRows = await db
    .select({
      ticket:  tickets,
      creator: { id: users.id, name: users.name },
    })
    .from(tickets)
    .innerJoin(users, eq(tickets.created_by, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(tickets.created_at);

  if (!ticketRows.length) {
    res.end();
    return;
  }

  const ids = ticketRows.map(r => r.ticket.id);

  // Assignees y labels de todos los tickets en dos queries
  const [assigneeRows, labelRows] = await Promise.all([
    db
      .select({
        ticket_id: ticketAssignees.ticket_id,
        name:      users.name,
      })
      .from(ticketAssignees)
      .innerJoin(users, eq(ticketAssignees.user_id, users.id))
      .where(inArray(ticketAssignees.ticket_id, ids)),
    db
      .select({
        ticket_id: ticketLabels.ticket_id,
        name:      labels.name,
      })
      .from(ticketLabels)
      .innerJoin(labels, eq(ticketLabels.label_id, labels.id))
      .where(inArray(ticketLabels.ticket_id, ids)),
  ]);

  // Indexar por ticket_id para acceso O(1)
  const assigneesByTicket = new Map<string, string[]>();
  for (const row of assigneeRows) {
    const list = assigneesByTicket.get(row.ticket_id) ?? [];
    list.push(row.name);
    assigneesByTicket.set(row.ticket_id, list);
  }

  const labelsByTicket = new Map<string, string[]>();
  for (const row of labelRows) {
    const list = labelsByTicket.get(row.ticket_id) ?? [];
    list.push(row.name);
    labelsByTicket.set(row.ticket_id, list);
  }

  // Escribir fila a fila (sin acumular en memoria)
  for (const { ticket, creator } of ticketRows) {
    res.write(csvRow([
      ticket.id,
      ticket.title,
      ticket.status,
      ticket.priority,
      (assigneesByTicket.get(ticket.id) ?? []).join(';'),
      (labelsByTicket.get(ticket.id)    ?? []).join(';'),
      creator.name,
      ticket.created_at,
      ticket.archived_at ?? '',
      ticket.archived_at ? 'true' : 'false',
    ]));
  }

  res.end();
}
