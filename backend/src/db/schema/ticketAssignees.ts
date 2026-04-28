import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { tickets } from './tickets';
import { users } from './users';

export const ticketAssignees = sqliteTable('ticket_assignees', {
  ticket_id: text('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  user_id:   text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.ticket_id, table.user_id] }),
}));

export type TicketAssignee    = typeof ticketAssignees.$inferSelect;
export type NewTicketAssignee = typeof ticketAssignees.$inferInsert;
