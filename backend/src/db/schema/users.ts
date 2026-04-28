import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id:         text('id').primaryKey(),
  name:       text('name').notNull(),
  email:      text('email').notNull().unique(),
  role:       text('role', { enum: ['admin', 'member'] }).notNull(),
  is_active:  integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
  updated_at: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
});

export type User    = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
