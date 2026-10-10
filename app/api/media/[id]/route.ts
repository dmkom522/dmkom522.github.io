import { sql, bucket } from "@/lib/server-content";
import {withCors} from "@/lib/cors";
export const dynamic="force-dynamic";
async function handler(_request: Request, context: { params: Promise<{id:string}> }) {
  const {id}=await context.params;
  const asset=await sql().prepare("SELECT a.object_key,a.mime FROM assets a WHERE a.id=? AND EXISTS (SELECT 1 FROM post_assets pa JOIN posts p ON p.id=pa.post_id WHERE pa.asset_id=a.id AND pa.published_referenced=1 AND p.published_markdown IS NOT NULL)").bind(id).first<{object_key:string;mime:string}>();
  if(!asset)return new Response("Not found",{status:404,headers:{"Cache-Control":"no-store"}});
  const object=await bucket().get(asset.object_key); if(!object)return new Response("Not found",{status:404});
  return new Response(object.body,{headers:{"Content-Type":asset.mime,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
export const GET=withCors(handler);export const OPTIONS=GET;
