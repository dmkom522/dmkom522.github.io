import {env} from "cloudflare:workers";
import {sql} from "@/lib/server-content";
import {withCors,frontendOrigin} from "@/lib/cors";
import {json,readJson,checkOrigin,HttpError} from "@/lib/admin-server";
import {githubIdentity,hashToken,randomToken,pkceChallenge,validVerifier} from "@/lib/github-auth-core";
export const dynamic="force-dynamic";
type Context={params:Promise<{path?:string[]}>};
async function handler(request:Request,context:Context){try{
  const path=(await context.params).path?.join("/")??"";
  const configured=Boolean(frontendOrigin()&&env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET&&env.OWNER_GITHUB_ID);
  if(path==="config"&&request.method==="GET")return json({configured});
  if(request.method!=="POST")throw new HttpError(405,"不支持此操作。");checkOrigin(request);
  if(path==="logout"){
    const token=request.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if(token)await sql().prepare("DELETE FROM auth_sessions WHERE token_hash=?").bind(await hashToken(token)).run();return json({ok:true});
  }
  if(!configured)throw new HttpError(503,"站主尚未配置 GitHub 登录。");
  const callback=frontendOrigin()+"/admin/callback/";const body=await readJson(request);
  if(path==="start"){
    if(typeof body.challenge!=="string"||!/^[A-Za-z0-9_-]{43}$/.test(body.challenge))throw new HttpError(400,"登录校验参数有误。");
    await sql().batch([sql().prepare("DELETE FROM oauth_states WHERE expires_at<?").bind(Date.now()),sql().prepare("DELETE FROM auth_sessions WHERE expires_at<?").bind(Date.now())]);
    const count=await sql().prepare("SELECT count(*) AS total FROM oauth_states").first<{total:number}>();if((count?.total??0)>=1000)throw new HttpError(429,"登录请求过多，请稍后重试。");
    const state=randomToken();await sql().prepare("INSERT INTO oauth_states (state_hash,challenge,expires_at) VALUES (?,?,?)").bind(await hashToken(state),body.challenge,Date.now()+10*60*1000).run();
    const url=new URL("https://github.com/login/oauth/authorize");url.search=new URLSearchParams({client_id:env.GITHUB_CLIENT_ID!,redirect_uri:callback,state,code_challenge:body.challenge,code_challenge_method:"S256",scope:"",allow_signup:"false",prompt:"select_account"}).toString();
    return json({url:url.href,state});
  }
  if(path==="exchange"){
    if(typeof body.code!=="string"||body.code.length>500||typeof body.state!=="string"||!/^[a-f0-9]{64}$/.test(body.state)||!validVerifier(body.verifier))throw new HttpError(400,"登录回调参数有误。");
    const state=await sql().prepare("DELETE FROM oauth_states WHERE state_hash=? AND challenge=? AND expires_at>? RETURNING state_hash").bind(await hashToken(body.state),await pkceChallenge(body.verifier),Date.now()).first();
    if(!state)throw new HttpError(400,"登录校验已过期或不匹配，请重新登录。");
    const user=await githubIdentity({clientId:env.GITHUB_CLIENT_ID!,clientSecret:env.GITHUB_CLIENT_SECRET!,code:body.code,verifier:body.verifier,redirectUri:callback});
    if(user.id!==env.OWNER_GITHUB_ID)throw new HttpError(403,"只有站主的 GitHub 账号可以管理博客。");
    const token=randomToken();const expires=Date.now()+7*24*60*60*1000;
    await sql().prepare("INSERT INTO auth_sessions (token_hash,github_id,expires_at) VALUES (?,?,?)").bind(await hashToken(token),user.id,expires).run();return json({token,expires,login:user.login});
  }
  throw new HttpError(404,"接口不存在。");
}catch(error){if(error instanceof HttpError)return json({error:error.message},error.status);return json({error:"GitHub 登录暂时不可用，请稍后重试。"},502);}}
const route=withCors(handler);export const GET=route;export const POST=route;export const OPTIONS=route;
