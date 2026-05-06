import { and, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../../db';
import { comments, tickets, ticketAssignees, users, notificationQueue } from '../../db/schema';
import type { UserRole, NotificationEvent } from '../../types';

function apiError(message: string, status: number, code: string): Error {
  return Object.assign(new Error(message), { status, code });
}

// Extrae handles únicos en minúsculas: "@john" → ["john"]
function extractMentions(body: string): string[] {
  const matches = body.match(/@(\w+)/g) ?? [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
}

function commentWithAuthor(row: {
  comment: typeof comments.$inferSelect;
  author:  { id: string; name: string; email: string };
}) {
  return { ...row.comment, author: row.author };
}

export async function listComments(ticketId: string) {
  const [ticket] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.id, ticketId));

  if (!ticket) throw apiError('Ticket not found', 404, 'not_found');

  const rows = await db
    .select({
      comment: comments,
      author:  { id: users.id, name: users.name, email: users.email },
    })
    .from(comments)
    .innerJoin(users, eq(comments.author_id, users.id))
    .where(and(eq(comments.ticket_id, ticketId), isNull(comments.archived_at)))
    .orderBy(comments.created_at);

  return rows.map(commentWithAuthor);
}

export async function createComment(ticketId: string, authorId: string, body: string) {
  const [ticket] = await db
    .select({ id: tickets.id, created_by: tickets.created_by })
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), isNull(tickets.archived_at)));

  if (!ticket) throw apiError('Ticket not found or archived', 404, 'not_found');

  const now       = new Date().toISOString();
  const commentId = randomUUID();

  await db.insert(comments).values({
    id:         commentId,
    ticket_id:  ticketId,
    author_id:  authorId,
    body,
    created_at: now,
  });

  // Acumula recipientes: userId → eventType (mention tiene prioridad sobre comment_added)
  const recipients = new Map<string, NotificationEvent>();

  // Creador del ticket
  if (ticket.created_by !== authorId) {
    recipients.set(ticket.created_by, 'comment_added');
  }

  // Asignados del ticket
  const assigneeRows = await db
    .select({ user_id: ticketAssignees.user_id })
    .from(ticketAssignees)
    .where(eq(ticketAssignees.ticket_id, ticketId));

  for (const { user_id } of assigneeRows) {
    if (user_id !== authorId && !recipients.has(user_id)) {
      recipients.set(user_id, 'comment_added');
    }
  }

  // @menciones: buscar por primer nombre del usuario (case-insensitive)
  const handles = extractMentions(body);
  if (handles.length) {
    const activeUsers = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.is_active, true));

    for (const user of activeUsers) {
      const handle = user.name.split(' ')[0].toLowerCase();
      if (handles.includes(handle) && user.id !== authorId) {
        recipients.set(user.id, 'mention');
      }
    }
  }

  // Encolar notificaciones
  if (recipients.size) {
    await db.insert(notificationQueue).values(
      [...recipients.entries()].map(([recipient_id, event_type]) => ({
        id:           randomUUID(),
        recipient_id,
        comment_id:   commentId,
        ticket_id:    ticketId,
        event_type,
        created_at:   now,
        updated_at:   now,
      })),
    );
  }

  const [row] = await db
    .select({
      comment: comments,
      author:  { id: users.id, name: users.name, email: users.email },
    })
    .from(comments)
    .innerJoin(users, eq(comments.author_id, users.id))
    .where(eq(comments.id, commentId));

  return commentWithAuthor(row);
}

export async function archiveComment(commentId: string, userId: string, role: UserRole) {
  const [comment] = await db
    .select()
    .from(comments)
    .where(and(eq(comments.id, commentId), isNull(comments.archived_at)));

  if (!comment) throw apiError('Comment not found', 404, 'not_found');

  if (role !== 'admin' && comment.author_id !== userId) {
    throw apiError('You can only archive your own comments', 403, 'forbidden');
  }

  const now = new Date().toISOString();
  await db.update(comments).set({ archived_at: now }).where(eq(comments.id, commentId));

  const [row] = await db
    .select({
      comment: comments,
      author:  { id: users.id, name: users.name, email: users.email },
    })
    .from(comments)
    .innerJoin(users, eq(comments.author_id, users.id))
    .where(eq(comments.id, commentId));

  return commentWithAuthor(row);
}
