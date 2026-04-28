import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { tickets } from './tickets';
import { users } from './users';

export const comments = sqliteTable('comments', {
  id:          text('id').primaryKey(),
  ticket_id:   text('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  author_id:   text('author_id').notNull().references(() => users.id),
  body:        text('body').notNull(),
  archived_at: text('archived_at'),
  created_at:  text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
});

export type Comment    = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
