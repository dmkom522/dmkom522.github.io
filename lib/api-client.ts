const frontendEnv=import.meta.env as Record<string,string|undefined>;
export const apiOrigin=(frontendEnv.VITE_BLOG_API_ORIGIN??"").replace(/\/$/,"");
const tokenKey="blog-admin-session";
export function sessionToken(){try{return sessionStorage.getItem(tokenKey)??"";}catch{return "";}}
export function setSessionToken(token:string){if(token)sessionStorage.setItem(tokenKey,token);else sessionStorage.removeItem(tokenKey);}
export function apiUrl(path:string){return apiOrigin+path;}
export function mediaUrl(path:string){return path.startsWith("/api/")?apiUrl(path):path;}
export function articleUrl(section:string,id:string){return apiOrigin?`/${section}/?post=${encodeURIComponent(id)}`:`/${section}/${id}`;}
export function apiFetch(path:string,options:RequestInit={}){
  const headers=new Headers(options.headers);const token=apiOrigin?sessionToken():"";
  if(token&&path.startsWith("/api/admin/"))headers.set("Authorization",`Bearer ${token}`);
  return fetch(apiUrl(path),{...options,headers,credentials:apiOrigin?"omit":"same-origin"}).then(response=>{if(apiOrigin&&token&&response.status===401&&path.startsWith("/api/admin/"))window.dispatchEvent(new Event("blog:session-expired"));return response;});
}
