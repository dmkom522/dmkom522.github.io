import { sql, bucket, getPost } from "@/lib/server-content";
import { requireOwner, initializeOwner, json, HttpError, checkOrigin, readJson } from "@/lib/admin-server";
import { isSection, mediaIds, exampleAbout } from "@/lib/content";
import { missingImages } from "@/lib/markdown-import";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path?: string[] }> };
async function handler(request: Request, context: Context): Promise<Response> {
  try {
    const path = (await context.params).path ?? []; const method = request.method;
    if (method !== "GET") checkOrigin(request);
    if (path.join("/") === "initialize" && method === "POST") return await initializeOwner();
    await requireOwner();
    if (path[0] === "status" && method === "GET") return json({ owner: true, initializationClosed: true });
    if (path[0] === "media") {
      if (method === "GET" && path.length === 1) {
        const rows=await sql().prepare("SELECT id,name,mime,size,created_at FROM assets ORDER BY created_at DESC").all();
        return json({assets:rows.results});
      }
      if (method === "POST" && path.length === 1) {
        if (Number(request.headers.get("content-length") ?? 0) > 8 * 1024 * 1024 + 20000) throw new HttpError(413, "图片不能超过 8 MB。");
        const form = await request.formData(); const file = form.get("file");
        if (!(file instanceof File) || file.size > 8 * 1024 * 1024) throw new HttpError(400, "请选择不超过 8 MB 的图片。");
        const bytes = new Uint8Array(await file.arrayBuffer());
        const type = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? "image/jpeg" :
          bytes.slice(0,8).join(",") === "137,80,78,71,13,10,26,10" ? "image/png" :
          String.fromCharCode(...bytes.slice(0,6)).match(/^GIF8[79]a$/) ? "image/gif" :
          String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP" ? "image/webp" : null;
        if (!type) throw new HttpError(400, "仅支持 JPG、PNG、WebP 和 GIF 图片。");
        const id = crypto.randomUUID(); const key = `images/${id}`;
        await bucket().put(key, bytes, { httpMetadata: { contentType: type } });
        try { await sql().prepare("INSERT INTO assets (id, object_key, name, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(id,key,file.name.slice(0,200),type,file.size,Date.now()).run(); }
        catch (error) { await bucket().delete(key); throw error; }
        return json({ id, url: `/api/media/${id}`, name: file.name }, 201);
      }
      if (method === "GET" && path.length === 2) {
        const asset = await sql().prepare("SELECT object_key, mime FROM assets WHERE id = ?").bind(path[1]).first<{object_key: string; mime: string}>();
        if (!asset) throw new HttpError(404, "图片不存在。"); const object = await bucket().get(asset.object_key);
        if (!object) throw new HttpError(404, "图片不存在。");
        return new Response(object.body, {headers:{"Content-Type":asset.mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
      }
      if (method === "DELETE" && path.length === 2) {
        const removed = await sql().prepare("DELETE FROM assets WHERE id=? AND NOT EXISTS (SELECT 1 FROM post_assets WHERE asset_id=? AND (draft_referenced=1 OR published_referenced=1)) RETURNING object_key").bind(path[1],path[1]).first<{object_key:string}>();
        if (!removed) throw new HttpError(409,"图片不存在或仍被文章引用。");
        await bucket().delete(removed.object_key); return json({ok:true});
      }
    }
    if (path[0] !== "posts") throw new HttpError(404, "接口不存在。");
    if (path.length === 1 && method === "GET") {
      const r = await sql().prepare("SELECT id, section, title, updated_at, published_at, revision, (published_markdown IS NOT NULL) AS is_published FROM posts ORDER BY updated_at DESC").all(); return json({ posts: r.results });
    }
    if (path.length === 1 && method === "POST") {
      const body = await readJson(request); if (!isSection(body.section) || body.section === "about") throw new HttpError(400, "请选择文章栏目。");
      const id = crypto.randomUUID(); const now = Date.now();
      await sql().prepare("INSERT INTO posts (id,section,title,created_at,updated_at) VALUES (?,?,'',?,?)").bind(id,body.section,now,now).run(); return json({ post: await getPost(id) },201);
    }
    const id = path[1]; let post = await getPost(id);
    if (id === "about" && !post && (method === "GET" || method === "PUT")) {
      if (method === "GET") return json({ post: {id:"about",section:"about",title:"About",draft_markdown:exampleAbout,draft_avatar:null,published_markdown:null,published_title:null,published_avatar:null,published_section:null,revision:0,created_at:Date.now(),updated_at:Date.now(),published_at:null,draft_version:"",has_published:0} });
      await sql().prepare("INSERT OR IGNORE INTO posts (id,section,title,created_at,updated_at) VALUES ('about','about','About',?,?)").bind(Date.now(),Date.now()).run(); post = await getPost(id);
    }
    if (!post) throw new HttpError(404, "文章不存在。");
    if (path.length === 2 && method === "GET") return json({ post });
    if (path.length === 2 && method === "PUT") {
      const body = await readJson(request);
      if (typeof body.title !== "string" || body.title.length > 200 || typeof body.markdown !== "string" || body.markdown.length > 1_000_000 || !Number.isInteger(body.revision) || !isSection(body.section) || (id === "about") !== (body.section === "about")) throw new HttpError(400, "标题、正文或栏目格式有误。");
      const avatar = typeof body.avatar === "string" ? body.avatar : null;
      const ids = mediaIds(body.markdown, avatar);
      for (const assetId of ids) if (!await sql().prepare("SELECT id FROM assets WHERE id = ?").bind(assetId).first()) throw new HttpError(400, "正文含有不存在的配图，请重新上传。");
      const token = crypto.randomUUID(); const now = Date.now();
      const queries = [sql().prepare("UPDATE posts SET title=?,section=?,draft_markdown=?,draft_avatar=?,updated_at=?,revision=revision+1,draft_version=? WHERE id=? AND revision=?").bind(body.title.trim(),body.section,body.markdown,avatar,now,token,id,body.revision),
        sql().prepare("UPDATE post_assets SET draft_referenced=0 WHERE post_id=? AND EXISTS(SELECT 1 FROM posts WHERE id=? AND draft_version=?)").bind(id,id,token)];
      for (const assetId of ids) queries.push(sql().prepare("INSERT INTO post_assets (post_id,asset_id,draft_referenced,published_referenced) SELECT ?,?,1,0 WHERE EXISTS(SELECT 1 FROM posts WHERE id=? AND draft_version=?) ON CONFLICT(post_id,asset_id) DO UPDATE SET draft_referenced=1").bind(id,assetId,id,token));
      const results = await sql().batch(queries);
      if (!results[0].meta.changes) throw new HttpError(409, "这篇文章已在其他窗口更新。当前文字已保留，请导出后重新打开文章。");
      return json({ post: await getPost(id) });
    }
    if (path.length === 3 && method === "POST" && ["publish","unpublish"].includes(path[2])) {
      const body = await readJson(request); if (body.revision !== post.revision) throw new HttpError(409, "文章已更新，请先保存最新草稿。");
      if (path[2] === "publish" && id !== "about" && !post.title.trim()) throw new HttpError(400, "发布前请填写标题。");
      if (path[2] === "publish" && missingImages(post.draft_markdown).length) throw new HttpError(400, "请补齐本地配图后再发布。");
      const query = path[2] === "publish" ?
        sql().prepare("UPDATE posts SET published_title=title,published_markdown=draft_markdown,published_avatar=draft_avatar,published_section=section,has_published=1,published_at=? WHERE id=? AND revision=?").bind(Date.now(),id,body.revision) :
        sql().prepare("UPDATE posts SET published_title=NULL,published_markdown=NULL,published_avatar=NULL,published_section=NULL,published_at=NULL WHERE id=? AND revision=?").bind(id,body.revision);
      const results = await sql().batch([query, sql().prepare("UPDATE post_assets SET published_referenced=CASE WHEN EXISTS (SELECT 1 FROM posts WHERE id=? AND published_markdown IS NOT NULL AND (instr(published_markdown, '/api/media/' || post_assets.asset_id)>0 OR published_avatar=post_assets.asset_id)) THEN 1 ELSE 0 END WHERE post_id=?").bind(id,id)]);
      if (!results[0].meta.changes) throw new HttpError(409, "文章已更新，请重试。");
      return json({post: await getPost(id)});
    }
    if (path.length === 2 && method === "DELETE") {
      await sql().batch([sql().prepare("DELETE FROM post_assets WHERE post_id=?").bind(id),sql().prepare("DELETE FROM posts WHERE id=?").bind(id)]); return json({ok:true});
    }
    throw new HttpError(405,"不支持此操作。");
  } catch (error) {
    if (error instanceof HttpError) return json({error:error.message},error.status);
    console.error("Admin request failed",error); return json({error:"服务暂时不可用，编辑内容仍保留，请稍后重试。"},500);
  }
}
export const GET=handler; export const POST=handler; export const PUT=handler; export const DELETE=handler;
