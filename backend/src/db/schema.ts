import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  primaryKey,
  check,
} from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';

// Reutilizado como default en todas las columnas timestamp
const now = sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`;

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id:         text('id').primaryKey(),
  name:       text('name').notNull(),
  email:      text('email').notNull().unique(),
  role:       text('role', { enum: ['admin', 'member'] }).notNull(),
  is_active:  integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull().default(now),
  updated_at: text('updated_at').notNull().default(now),
}, (t) => ({
  roleCheck:   check('users_role_check',    sql`role IN ('admin','member')`),
  emailIdx:    uniqueIndex('users_email_idx').on(t.email),
  activeIdx:   index('users_is_active_idx').on(t.is_active),
}));

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH TOKENS
// ─────────────────────────────────────────────────────────────────────────────
export const refreshTokens = sqliteTable('refresh_tokens', {
  id:         text('id').primaryKey(),
  user_id:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token_hash: text('token_hash').notNull().unique(),
  expires_at: text('expires_at').notNull(),
  created_at: text('created_at').notNull().default(now),
}, (t) => ({
  tokenIdx:  uniqueIndex('rt_token_hash_idx').on(t.token_hash),
  userIdx:   index('rt_user_id_idx').on(t.user_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// TICKETS
// ─────────────────────────────────────────────────────────────────────────────
export const tickets = sqliteTable('tickets', {
  id:          text('id').primaryKey(),
  title:       text('title').notNull(),
  description: text('description'),
  status:      text('status', { enum: ['todo', 'in_progress', 'review', 'done'] }).notNull().default('todo'),
  priority:    text('priority', { enum: ['low', 'medium', 'high'] }).notNull(),
  is_blocked:  integer('is_blocked', { mode: 'boolean' }).notNull().default(false),
  version:     integer('version').notNull().default(1),
  created_by:  text('created_by').notNull().references(() => users.id),
  archived_at: text('archived_at'),
  created_at:  text('created_at').notNull().default(now),
  updated_at:  text('updated_at').notNull().default(now),
}, (t) => ({
  titleLenCheck: check('tickets_title_len_check', sql`length(title) <= 120`),
  statusCheck:   check('tickets_status_check',    sql`status IN ('todo','in_progress','review','done')`),
  priorityCheck: check('tickets_priority_check',  sql`priority IN ('low','medium','high')`),
  statusIdx:     index('tickets_status_idx').on(t.status),
  priorityIdx:   index('tickets_priority_idx').on(t.priority),
  createdByIdx:  index('tickets_created_by_idx').on(t.created_by),
  archivedIdx:   index('tickets_archived_at_idx').on(t.archived_at),
  createdAtIdx:  index('tickets_created_at_idx').on(t.created_at),
}));

// ─────────────────────────────────────────────────────────────────────────────
// TICKET ASSIGNEES  (many-to-many: tickets ↔ users)
// ─────────────────────────────────────────────────────────────────────────────
export const ticketAssignees = sqliteTable('ticket_assignees', {
  ticket_id: text('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  user_id:   text('user_id').notNull().references(() => users.id,   { onDelete: 'cascade' }),
}, (t) => ({
  pk:      primaryKey({ columns: [t.ticket_id, t.user_id] }),
  userIdx: index('ta_user_id_idx').on(t.user_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// LABELS  (catálogo centralizado)
// ─────────────────────────────────────────────────────────────────────────────
export const labels = sqliteTable('labels', {
  id:         text('id').primaryKey(),
  name:       text('name').notNull().unique(),
  color:      text('color').notNull(),
  created_at: text('created_at').notNull().default(now),
  updated_at: text('updated_at').notNull().default(now),
}, (t) => ({
  nameIdx: uniqueIndex('labels_name_idx').on(t.name),
}));

// ─────────────────────────────────────────────────────────────────────────────
// TICKET LABELS  (many-to-many: tickets ↔ labels)
// ─────────────────────────────────────────────────────────────────────────────
export const ticketLabels = sqliteTable('ticket_labels', {
  ticket_id: text('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  label_id:  text('label_id').notNull().references(() => labels.id,   { onDelete: 'cascade' }),
}, (t) => ({
  pk:       primaryKey({ columns: [t.ticket_id, t.label_id] }),
  labelIdx: index('tl_label_id_idx').on(t.label_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// COMMENTS
// ─────────────────────────────────────────────────────────────────────────────
export const comments = sqliteTable('comments', {
  id:          text('id').primaryKey(),
  ticket_id:   text('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  author_id:   text('author_id').notNull().references(() => users.id),
  body:        text('body').notNull(),
  archived_at: text('archived_at'),
  created_at:  text('created_at').notNull().default(now),
}, (t) => ({
  ticketIdx:   index('comments_ticket_id_idx').on(t.ticket_id),
  authorIdx:   index('comments_author_id_idx').on(t.author_id),
  archivedIdx: index('comments_archived_at_idx').on(t.archived_at),
}));

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION QUEUE
// ─────────────────────────────────────────────────────────────────────────────
export const notificationQueue = sqliteTable('notification_queue', {
  id:              text('id').primaryKey(),
  recipient_id:    text('recipient_id').notNull().references(() => users.id,    { onDelete: 'cascade' }),
  comment_id:      text('comment_id').notNull().references(() => comments.id,   { onDelete: 'cascade' }),
  ticket_id:       text('ticket_id').notNull().references(() => tickets.id,     { onDelete: 'cascade' }),
  event_type:      text('event_type', { enum: ['comment_added', 'mention', 'ticket_assigned'] }).notNull(),
  status:          text('status',     { enum: ['pending', 'processing', 'sent', 'failed'] }).notNull().default('pending'),
  attempts:        integer('attempts').notNull().default(0),
  max_attempts:    integer('max_attempts').notNull().default(3),
  next_attempt_at: text('next_attempt_at').notNull().default(now),
  last_error:      text('last_error'),
  created_at:      text('created_at').notNull().default(now),
  updated_at:      text('updated_at').notNull().default(now),
}, (t) => ({
  eventTypeCheck: check('nq_event_type_check', sql`event_type IN ('comment_added','mention','ticket_assigned')`),
  statusCheck:    check('nq_status_check',     sql`status IN ('pending','processing','sent','failed')`),
  // Índice compuesto principal para el worker (filtra por status + próximo intento)
  workerIdx:      index('nq_status_next_attempt_idx').on(t.status, t.next_attempt_at),
  recipientIdx:   index('nq_recipient_id_idx').on(t.recipient_id),
  commentIdx:     index('nq_comment_id_idx').on(t.comment_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS  (para Drizzle relational queries: db.query.*)
// ─────────────────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  createdTickets:  many(tickets),
  assignedTickets: many(ticketAssignees),
  comments:        many(comments),
  refreshTokens:   many(refreshTokens),
  notifications:   many(notificationQueue),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.user_id], references: [users.id] }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  creator:       one(users, { fields: [tickets.created_by], references: [users.id] }),
  assignees:     many(ticketAssignees),
  labels:        many(ticketLabels),
  comments:      many(comments),
  notifications: many(notificationQueue),
}));

export const ticketAssigneesRelations = relations(ticketAssignees, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketAssignees.ticket_id], references: [tickets.id] }),
  user:   one(users,   { fields: [ticketAssignees.user_id],   references: [users.id] }),
}));

export const labelsRelations = relations(labels, ({ many }) => ({
  tickets: many(ticketLabels),
}));

export const ticketLabelsRelations = relations(ticketLabels, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketLabels.ticket_id], references: [tickets.id] }),
  label:  one(labels,  { fields: [ticketLabels.label_id],  references: [labels.id] }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  ticket:        one(tickets, { fields: [comments.ticket_id], references: [tickets.id] }),
  author:        one(users,   { fields: [comments.author_id], references: [users.id] }),
  notifications: many(notificationQueue),
}));

export const notificationQueueRelations = relations(notificationQueue, ({ one }) => ({
  recipient: one(users,    { fields: [notificationQueue.recipient_id], references: [users.id] }),
  comment:   one(comments, { fields: [notificationQueue.comment_id],   references: [comments.id] }),
  ticket:    one(tickets,  { fields: [notificationQueue.ticket_id],    references: [tickets.id] }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// INFERRED TYPES
// ─────────────────────────────────────────────────────────────────────────────
export type User               = typeof users.$inferSelect;
export type NewUser            = typeof users.$inferInsert;
export type RefreshToken       = typeof refreshTokens.$inferSelect;
export type NewRefreshToken    = typeof refreshTokens.$inferInsert;
export type Ticket             = typeof tickets.$inferSelect;
export type NewTicket          = typeof tickets.$inferInsert;
export type TicketAssignee     = typeof ticketAssignees.$inferSelect;
export type NewTicketAssignee  = typeof ticketAssignees.$inferInsert;
export type Label              = typeof labels.$inferSelect;
export type NewLabel           = typeof labels.$inferInsert;
export type TicketLabel        = typeof ticketLabels.$inferSelect;
export type NewTicketLabel     = typeof ticketLabels.$inferInsert;
export type Comment            = typeof comments.$inferSelect;
export type NewComment         = typeof comments.$inferInsert;
export type NotificationJob    = typeof notificationQueue.$inferSelect;
export type NewNotificationJob = typeof notificationQueue.$inferInsert;
