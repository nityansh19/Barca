import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const feedCache = sqliteTable('feed_cache', {
  key: text('key').primaryKey(),
  payload: text('payload'),
  updatedAt: integer('updated_at').notNull().default(0),
  retryAfter: integer('retry_after').notNull().default(0),
});
