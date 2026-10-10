import { env } from "cloudflare:workers";
import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { sql, ownerId } from "./server-content";
import {allowedOrigin} from "./cors";
import {githubSession} from "./github-session";
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function json(value: unknown, status = 200) { return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
export async function requireOwner(request?:Request) {
  if(request?.headers.has("authorization")){const session=await githubSession(request);if(!session)throw new HttpError(401,"登录已过期，请重新使用 GitHub 登录。");return session;}
  const user = await getChatGPTUser(); if (!user) throw new HttpError(401, "请先使用 ChatGPT 登录。");
  if (await ownerId() !== user.userId) throw new HttpError(403, "只有站主可以管理内容。"); return user;
}
export async function canInitialize(user: ChatGPTUser) {
  return Boolean(env.OWNER_EMAIL && user.email.toLowerCase() === env.OWNER_EMAIL.trim().toLowerCase());
}
export async function initializeOwner() {
  const user = await getChatGPTUser(); if (!user) throw new HttpError(401, "请先登录。");
  if (await ownerId()) throw new HttpError(404, "初始化入口已关闭。");
  if (!await canInitialize(user)) throw new HttpError(403, "此账号不能绑定站主。");
  await sql().prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('owner_id', ?)").bind(user.userId).run();
  if (await ownerId() !== user.userId) throw new HttpError(403, "站主已由其他账号绑定。");
  return json({ ok: true });
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigin(request)) throw new HttpError(403, "请从本站后台提交操作。");
}
export async function readJson(request: Request) {
  const text = await request.text(); if (text.length > 1_100_000) throw new HttpError(413, "文章过大，请保持在 1 MB 以内。");
  try {const value=JSON.parse(text);if(!value||typeof value!=="object"||Array.isArray(value))throw new Error();return value;} catch { throw new HttpError(400, "请求内容格式有误。"); }
}
