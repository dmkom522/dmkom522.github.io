import {sql,publishedPost,publishedList} from "@/lib/server-content";
import {exampleAbout,sections,type Section} from "@/lib/content";
import {withCors} from "@/lib/cors";
import {json} from "@/lib/admin-server";
export const dynamic="force-dynamic";
type Context={params:Promise<{path?:string[]}>};
async function handler(request:Request,context:Context){
  const path=(await context.params).path??[];
  if(path.length===1&&path[0]==="about"){
    const about=await sql().prepare("SELECT has_published,published_title,published_markdown,published_avatar FROM posts WHERE id='about'").first<{has_published:number;published_title:string|null;published_markdown:string|null;published_avatar:string|null}>();
    return json({title:about?.published_title||"About",markdown:about?.has_published?about.published_markdown??"":exampleAbout,avatar:about?.published_avatar?`/api/media/${about.published_avatar}`:"/images/avatar.jpg"});
  }
  if(path.length===1){const post=await publishedPost(path[0]);return post&&post.section!=="about"?json({post}):json({error:"文章不存在或已撤回。"},404);}
  const section=new URL(request.url).searchParams.get("section");
  if(path.length||!sections.includes(section as typeof sections[number]))return json({error:"栏目不存在。"},404);
  return json({posts:await publishedList(section as Section)});
}
export const GET=withCors(handler);export const OPTIONS=GET;
