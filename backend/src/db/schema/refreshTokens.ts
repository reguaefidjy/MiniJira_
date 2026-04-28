import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const refreshTokens = sqliteTable('refresh_tokens', {
  id:          text('id').primaryKey(),
  user_id:     text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token_hash:  text('token_hash').notNull().unique(),
  expires_at:  text('expires_at').notNull(),
  created_at:  text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
});

export type RefreshToken    = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
