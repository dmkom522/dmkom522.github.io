
import { notFound } from "next/navigation";
import { publishedPost } from "@/lib/server-content";
import { sections, sectionLabels, formatDate } from "@/lib/content";
import { Markdown } from "@/app/markdown";
export const dynamic="force-dynamic";
export default async function Article({params}:{params:Promise<{section:string;id:string}>}) {
  const {section,id}=await params; if(!sections.includes(section as typeof sections[number]))notFound();
  const post=await publishedPost(id);if(!post||post.section!==section)notFound();
  return <main className="page-frame main-content article-page"><a className="back-link" href={`/${section}`}>← {sectionLabels[post.section]}</a><article><h1>{post.title}</h1><time className="article-date" dateTime={new Date(post.published_at).toISOString()}>{formatDate(post.published_at)}</time><Markdown source={post.markdown}/></article></main>;
}
export async function generateMetadata({params}:{params:Promise<{id:string}>}) {const {id}=await params;const post=await publishedPost(id);return {title:post?.title??"文章"};}
