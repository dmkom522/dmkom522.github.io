import { env } from "cloudflare:workers";
import type { Post, PublicPost, Section } from "./content";
export function sql() { if (!env.DB) throw new Error("数据库未连接"); return env.DB; }
export function bucket() { if (!env.BUCKET) throw new Error("图片存储未连接"); return env.BUCKET; }
export async function getPost(id: string) { return sql().prepare("SELECT * FROM posts WHERE id = ?").bind(id).first<Post>(); }
export async function ownerId() { return (await sql().prepare("SELECT value FROM settings WHERE key = 'owner_id'").first<{value: string}>())?.value ?? null; }
export async function publishedPost(id: string): Promise<PublicPost | null> {
  return sql().prepare("SELECT id, published_section AS section, published_title AS title, published_markdown AS markdown, published_at, published_avatar AS avatar FROM posts WHERE id = ? AND published_markdown IS NOT NULL").bind(id).first<PublicPost>();
}
export async function publishedList(section: Section) {
  const r = await sql().prepare("SELECT id, published_section AS section, published_title AS title, published_at FROM posts WHERE published_section = ? AND published_markdown IS NOT NULL ORDER BY published_at DESC").bind(section).all<Pick<PublicPost,"id"|"section"|"title"|"published_at">>(); return r.results;
}
