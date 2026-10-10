import { sql } from "@/lib/server-content";
import { searchExcerpt, type PublicPost } from "@/lib/content";
import {withCors} from "@/lib/cors";
export const dynamic="force-dynamic";
async function handler(request: Request) {
  const query=(new URL(request.url).searchParams.get("q")??"").trim().slice(0,200);
  const terms=query.toLowerCase().split(/\s+/).filter(Boolean).slice(0,10);
  if(!terms.length)return Response.json({results:[]},{headers:{"Cache-Control":"no-store"}});
  const where=terms.map(()=>"instr(lower(published_title || ' ' || published_markdown),?)>0").join(" AND ");
  const r=await sql().prepare(`SELECT id,published_section AS section,published_title AS title,substr(published_markdown,max(1,instr(lower(published_markdown),?)-40),240) AS markdown,published_at FROM posts WHERE published_section!='about' AND published_markdown IS NOT NULL AND ${where} ORDER BY published_at DESC LIMIT 50`).bind(terms[0],...terms).all<PublicPost>();
  return Response.json({results:r.results.map(p=>({id:p.id,section:p.section,title:p.title,excerpt:searchExcerpt(p.markdown,query),url:`/${p.section}/${p.id}`}))},{headers:{"Cache-Control":"no-store"}});
}
export const GET=withCors(handler);export const OPTIONS=GET;
