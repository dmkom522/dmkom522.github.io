CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `post_assets` (
	`post_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`draft_referenced` integer DEFAULT 0 NOT NULL,
	`published_referenced` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`post_id`, `asset_id`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`section` text NOT NULL,
	`title` text NOT NULL,
	`draft_markdown` text DEFAULT '' NOT NULL,
	`draft_avatar` text,
	`published_title` text,
	`published_markdown` text,
	`published_avatar` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`published_at` integer,
	`revision` integer DEFAULT 0 NOT NULL,
	`draft_version` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
