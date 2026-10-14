import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", { key: text("key").primaryKey(), value: text("value").notNull() });
export const authSessions=sqliteTable("auth_sessions",{tokenHash:text("token_hash").primaryKey(),githubId:text("github_id").notNull(),expiresAt:integer("expires_at").notNull()});
export const oauthStates=sqliteTable("oauth_states",{stateHash:text("state_hash").primaryKey(),challenge:text("challenge").notNull(),expiresAt:integer("expires_at").notNull()});
export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(), section: text("section").notNull(), title: text("title").notNull(),
  draftMarkdown: text("draft_markdown").notNull().default(""), draftAvatar: text("draft_avatar"),
  publishedTitle: text("published_title"), publishedMarkdown: text("published_markdown"), publishedAvatar: text("published_avatar"), publishedSection: text("published_section"),
  createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(), publishedAt: integer("published_at"),
  publishedCreatedAt: integer("published_created_at"), publishedUpdatedAt: integer("published_updated_at"),
  revision: integer("revision").notNull().default(0), draftVersion: text("draft_version").notNull().default(""),
  hasPublished: integer("has_published").notNull().default(0),
});
export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(), objectKey: text("object_key").notNull(), name: text("name").notNull(),
  mime: text("mime").notNull(), size: integer("size").notNull(), createdAt: integer("created_at").notNull(),
});
export const postAssets = sqliteTable("post_assets", {
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  draftReferenced: integer("draft_referenced").notNull().default(0),
  publishedReferenced: integer("published_referenced").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.postId, table.assetId] })]);
