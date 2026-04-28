import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { tickets } from './tickets';
import { labels } from './labels';

export const ticketLabels = sqliteTable('ticket_labels', {
  ticket_id: text('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  label_id:  text('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.ticket_id, table.label_id] }),
}));

export type TicketLabel    = typeof ticketLabels.$inferSelect;
export type NewTicketLabel = typeof ticketLabels.$inferInsert;
