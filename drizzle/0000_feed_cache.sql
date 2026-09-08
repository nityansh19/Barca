CREATE TABLE `feed_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text,
	`updated_at` integer DEFAULT 0 NOT NULL,
	`retry_after` integer DEFAULT 0 NOT NULL
);

