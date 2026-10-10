import {env} from "cloudflare:workers";
export function frontendOrigin(){return (env.FRONTEND_ORIGIN??"").replace(/\/$/,"");}
export function allowedOrigin(request:Request){const origin=request.headers.get("origin");return !origin||origin===new URL(request.url).origin||Boolean(frontendOrigin()&&origin===frontendOrigin());}
type RouteContext={params:Promise<Record<string,string|string[]|undefined>>};
export function withCors<C=RouteContext>(handler:(request:Request,context:C)=>Promise<Response>){return async(request:Request,context:C)=>{
  const origin=request.headers.get("origin");
  if(!allowedOrigin(request))return new Response("Origin not allowed",{status:403,headers:{"Cache-Control":"no-store"}});
  const response=request.method==="OPTIONS"?new Response(null,{status:204}):await handler(request,context);
  const headers=new Headers(response.headers);headers.set("Vary",[headers.get("Vary"),"Origin"].filter(Boolean).join(", "));
  if(origin){headers.set("Access-Control-Allow-Origin",origin);headers.set("Access-Control-Allow-Methods","GET, POST, PUT, DELETE, OPTIONS");headers.set("Access-Control-Allow-Headers","Content-Type, Authorization");headers.set("Access-Control-Max-Age","600");}
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
};}
