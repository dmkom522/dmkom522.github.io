export function randomToken(){return [...crypto.getRandomValues(new Uint8Array(32))].map(byte=>byte.toString(16).padStart(2,"0")).join("");}
export async function hashToken(value:string){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))].map(byte=>byte.toString(16).padStart(2,"0")).join("");}
export async function pkceChallenge(verifier:string){const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier)));return btoa(String.fromCharCode(...digest)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
export function validVerifier(value:unknown):value is string{return typeof value==="string"&&/^[A-Za-z0-9._~-]{43,128}$/.test(value);}
export async function githubIdentity(input:{clientId:string;clientSecret:string;code:string;verifier:string;redirectUri:string},fetcher:typeof fetch=fetch){
  const response=await fetcher("https://github.com/login/oauth/access_token",{method:"POST",headers:{"Accept":"application/json","Content-Type":"application/json"},body:JSON.stringify({client_id:input.clientId,client_secret:input.clientSecret,code:input.code,code_verifier:input.verifier,redirect_uri:input.redirectUri}),signal:AbortSignal.timeout(15000)});
  const token=await response.json() as {access_token?:string};if(!response.ok||!token.access_token)throw new Error("GitHub 授权失败，请重新登录。");
  const profile=await fetcher("https://api.github.com/user",{headers:{Authorization:`Bearer ${token.access_token}`,Accept:"application/vnd.github+json","User-Agent":"Personal-Notebook","X-GitHub-Api-Version":"2022-11-28"},signal:AbortSignal.timeout(15000)});
  const user=await profile.json() as {id?:number;login?:string};if(!profile.ok||!Number.isSafeInteger(user.id)||typeof user.login!=="string")throw new Error("无法核对 GitHub 身份，请重试。");
  return {id:String(user.id),login:user.login};
}
