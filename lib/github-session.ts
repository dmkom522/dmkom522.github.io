import {env} from "cloudflare:workers";
import {sql} from "./server-content";
import {hashToken} from "./github-auth-core";
export async function githubSession(request:Request){const token=request.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!token)return null;
  const session=await sql().prepare("SELECT github_id,expires_at FROM auth_sessions WHERE token_hash=? AND expires_at>?").bind(await hashToken(token),Date.now()).first<{github_id:string;expires_at:number}>();
  return session&&env.OWNER_GITHUB_ID&&session.github_id===env.OWNER_GITHUB_ID?{userId:`github:${session.github_id}`,displayName:"站主",email:"",fullName:null}:null;
}
