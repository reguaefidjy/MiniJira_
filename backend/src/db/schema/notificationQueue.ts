import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { comments } from './comments';
import { tickets } from './tickets';

export const notificationQueue = sqliteTable('notification_queue', {
  id:              text('id').primaryKey(),
  recipient_id:    text('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  comment_id:      text('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
  ticket_id:       text('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  event_type:      text('event_type', { enum: ['comment_added', 'mention', 'ticket_assigned'] }).notNull(),
  status:          text('status', { enum: ['pending', 'processing', 'sent', 'failed'] }).notNull().default('pending'),
  attempts:        integer('attempts').notNull().default(0),
  max_attempts:    integer('max_attempts').notNull().default(3),
  next_attempt_at: text('next_attempt_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
  last_error:      text('last_error'),
  created_at:      text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
  updated_at:      text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`),
});

export type NotificationJob    = typeof notificationQueue.$inferSelect;
export type NewNotificationJob = typeof notificationQueue.$inferInsert;
