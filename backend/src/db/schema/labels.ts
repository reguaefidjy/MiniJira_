import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const labels = sqliteTable('labels', {
  id:         text('id').primaryKey(),
  name:       text('name').notNull().unique(),
  color:      text('color').notNull(),
  created_at: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
  updated_at: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
});

export type Label    = typeof labels.$inferSelect;
export type NewLabel = typeof labels.$inferInsert;
