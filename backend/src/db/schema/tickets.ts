import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

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
  created_at:  text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
  updated_at:  text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
});

export type Ticket    = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
