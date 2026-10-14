export const sections = ["notes", "paper-reading", "projects"] as const;
export type Section = typeof sections[number] | "about";
export const sectionLabels: Record<Section, string> = { notes: "Notes", "paper-reading": "Paper reading", projects: "Projects", about: "About" };
export const exampleAbout = "这里记录我的学习笔记、论文阅读，以及项目中的一些尝试。\n\n把零散的想法和遇到的问题整理清楚，也留给以后的自己回看。";
export type Post = {
  id: string; section: Section; title: string; draft_markdown: string; draft_avatar: string | null;
  published_title: string | null; published_markdown: string | null; published_avatar: string | null; published_section: Section | null;
  created_at: number; updated_at: number; published_at: number | null; published_created_at: number | null; published_updated_at: number | null; revision: number; draft_version: string; has_published: number;
};
export type PublicPost = { id: string; section: Section; title: string; markdown: string; created_at: number; updated_at: number; published_at: number; avatar: string | null };
export function isSection(value: unknown): value is Section { return value === "about" || sections.includes(value as typeof sections[number]); }
export function formatDate(timestamp: number) { return new Intl.DateTimeFormat("zh-CN", {timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(timestamp)); }
export function dateInputValue(timestamp:number) {
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(timestamp));
  return ["year","month","day"].map(type=>parts.find(part=>part.type===type)?.value).join("-");
}
export function parseDateInput(value:string) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const timestamp=Date.parse(`${value}T00:00:00+08:00`);
  return Number.isFinite(timestamp)&&dateInputValue(timestamp)===value?timestamp:null;
}
export function plainText(markdown: string) { return markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[`#$*_>~|]/g, " ").replace(/\s+/g, " ").trim(); }
export function searchExcerpt(markdown: string, query: string) {
  const text = plainText(markdown); const term = query.trim().split(/\s+/)[0] ?? "";
  const index = text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
  const start = Math.max(0, index - 36);
  return (start ? "…" : "") + text.slice(start, start + 150) + (text.length > start + 150 ? "…" : "");
}
export function mediaIds(markdown: string, avatar: string | null = null) {
  const ids = new Set([...markdown.matchAll(/\/api\/(?:admin\/)?media\/([a-zA-Z0-9-]+)/g)].map(match => match[1]));
  if (avatar) ids.add(avatar); return [...ids];
}
