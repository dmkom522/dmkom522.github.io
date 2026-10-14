
import { notFound } from "next/navigation";
import { sections, sectionLabels, formatDate } from "@/lib/content";
import { publishedList } from "@/lib/server-content";
export const dynamic="force-dynamic";
export default async function Collection({params}:{params:Promise<{section:string}>}) {
  const {section}=await params; if(!sections.includes(section as typeof sections[number]))notFound();
  const key=section as typeof sections[number];const posts=await publishedList(key);
  return <main className="page-frame main-content"><h1>{sectionLabels[key]}</h1><ul className="post-list">{posts.map(post=><li key={post.id}><a href={`/${section}/${post.id}`}>{post.title}</a><time dateTime={new Date(post.created_at).toISOString()}>{formatDate(post.created_at)}</time></li>)}</ul></main>;
}
export async function generateMetadata({params}:{params:Promise<{section:string}>}) {const {section}=await params;return {title:sectionLabels[section as keyof typeof sectionLabels]??"页面"};}
