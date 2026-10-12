import {useEffect,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import {Navigation} from "@/app/navigation";
import {Markdown} from "@/app/markdown";
import {AdminEditor} from "@/app/admin/editor";
import {apiFetch,apiUrl,articleUrl,mediaUrl,sessionToken,setSessionToken} from "@/lib/api-client";
import {formatDate,sectionLabels,sections,type Section,type PublicPost} from "@/lib/content";
import {pkceChallenge,randomToken} from "@/lib/github-auth-core";
import "@/app/globals.css";
import "katex/dist/katex.min.css";

async function request<T>(path:string,options:RequestInit={}):Promise<T>{const response=await apiFetch(path,options);const data=await response.json() as T&{error?:string};if(!response.ok)throw new Error(data.error||"暂时无法读取内容，请稍后重试。");return data;}
function useContent<T>(path:string){
  const [state,setState]=useState<{data:T|null;error:string}>({data:null,error:""});
  useEffect(()=>{const controller=new AbortController();setState({data:null,error:""});void request<T>(path,{signal:controller.signal}).then(data=>setState({data,error:""})).catch(error=>{if(!controller.signal.aborted)setState({data:null,error:error instanceof TypeError?"无法连接内容服务，请稍后重试。":error instanceof Error?error.message:"暂时无法读取内容。"});});return()=>controller.abort();},[path]);return state;
}
function LoadState({error}:{error:string}){return error?<p className="notice" role="alert">{error} <button className="text-button" onClick={()=>location.reload()}>重新加载</button></p>:<div className="page-loading" role="status" aria-label="正在加载" aria-busy="true"><span className="loading-line" aria-hidden="true"/></div>;}
function Home(){
  const {data,error}=useContent<{title:string;markdown:string;avatar:string}>("/api/content/about");
  useEffect(()=>{document.title=data?.title||"About";},[data?.title]);
  return <main className="page-frame main-content" id="about" aria-labelledby="about-title">{data?<div className="about-heading"><img className="avatar-image" src={mediaUrl(data.avatar)} width="200" height="200" alt="头像"/><div className="about-copy"><h1 id="about-title">{data.title}</h1><Markdown source={data.markdown}/></div></div>:<LoadState error={error}/>}</main>;
}
function Collection({section}:{section:Section}){
  const {data,error}=useContent<{posts:Pick<PublicPost,"id"|"section"|"title"|"published_at">[]}>(`/api/content?section=${section}`);
  useEffect(()=>{document.title=sectionLabels[section];},[section]);
  return <main className="page-frame main-content"><h1>{sectionLabels[section]}</h1>{!data?<LoadState error={error}/>:<ul className="post-list">{data.posts.map(post=><li key={post.id}><a href={articleUrl(post.section,post.id)}>{post.title}</a><time dateTime={new Date(post.published_at).toISOString()}>{formatDate(post.published_at)}</time></li>)}</ul>}</main>;
}
function Article({id,section}:{id:string;section:Section}){
  const {data,error}=useContent<{post:PublicPost}>(`/api/content/${encodeURIComponent(id)}`);const post=data?.post;
  useEffect(()=>{document.title=post?.title||"文章";},[post?.title]);
  return <main className="page-frame main-content"><a className="back-link" href={`/${section}/`}>← {sectionLabels[section]}</a>{post&&post.section===section?<article><h1>{post.title}</h1><time className="article-date" dateTime={new Date(post.published_at).toISOString()}>{formatDate(post.published_at)}</time><Markdown source={post.markdown}/></article>:<LoadState error={post?"文章不在当前栏目。":error}/>}</main>;
}
function LoginButton(){
  const [working,setWorking]=useState(false);const [error,setError]=useState("");
  async function login(){setWorking(true);setError("");try{
    const verifier=randomToken();sessionStorage.setItem("blog-oauth-verifier",verifier);
    const result=await request<{url:string;state:string}>("/api/auth/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({challenge:await pkceChallenge(verifier)})});
    sessionStorage.setItem("blog-oauth-state",result.state);location.assign(result.url);
  }catch(reason){setWorking(false);setError(reason instanceof Error?reason.message:"无法开始登录。");}}
  return <>{error&&<p className="notice" role="alert">{error}</p>}<button className="button primary" disabled={working} onClick={()=>void login()}>{working?"正在跳转…":"使用 GitHub 登录"}</button></>;
}
function Callback(){
  const started=useRef(false);const [error,setError]=useState("");
  useEffect(()=>{if(started.current)return;started.current=true;
    void(async()=>{try{
      const query=new URLSearchParams(location.search);const code=query.get("code");const state=query.get("state");
      const expected=sessionStorage.getItem("blog-oauth-state");const verifier=sessionStorage.getItem("blog-oauth-verifier");
      history.replaceState(null,"","/admin/callback/");sessionStorage.removeItem("blog-oauth-state");sessionStorage.removeItem("blog-oauth-verifier");
      if(query.has("error"))throw new Error("GitHub 授权已取消，可以重新登录。");
      if(!code||!state||state!==expected||!verifier)throw new Error("登录校验不匹配或已过期，请重新登录。");
      const result=await request<{token:string}>("/api/auth/exchange",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,state,verifier})});setSessionToken(result.token);location.replace("/admin/");
    }catch(reason){setError(reason instanceof Error?reason.message:"无法完成登录，请重试。");}})();
  },[]);
  return <main className="page-frame main-content login-page"><h1>站主登录</h1>{error?<><p className="notice" role="alert">{error}</p><LoginButton/></>:<p role="status">正在核对 GitHub 身份…</p>}</main>;
}
function Admin(){
  const [status,setStatus]=useState<"loading"|"ready"|"login"|"unconfigured"|"error">("loading");const [error,setError]=useState("");const [expired,setExpired]=useState(false);
  useEffect(()=>{document.title="内容管理";const expired=()=>setExpired(true);window.addEventListener("blog:session-expired",expired);void(async()=>{try{
    if(sessionToken()){const response=await apiFetch("/api/admin/status");if(response.ok){setStatus("ready");return;}if(response.status!==401&&response.status!==403)throw new Error("后台暂时无法连接，请稍后重试。");setSessionToken("");}
    const config=await request<{configured:boolean}>("/api/auth/config");setStatus(config.configured?"login":"unconfigured");
  }catch(reason){setError(reason instanceof Error?reason.message:"后台暂时不可用。");setStatus("error");}})();return()=>window.removeEventListener("blog:session-expired",expired);},[]);
  async function logout(){const response=await fetch(apiUrl("/api/auth/logout"),{method:"POST",credentials:"omit",headers:{Authorization:`Bearer ${sessionToken()}`}});if(!response.ok)throw new Error("退出失败，请稍后重试。");setSessionToken("");setStatus("login");setExpired(false);}
  if(status==="ready")return <>{expired&&<div className="session-notice notice" role="alert"><p>登录已过期。当前编辑内容保留在本机，重新登录后可恢复。</p><LoginButton/></div>}<AdminEditor initialized signOutUrl="/admin/" onSignOut={logout}/></>;
  return <main className="page-frame main-content login-page"><h1>站主登录</h1>{status==="loading"?<LoadState error=""/>:status==="error"?<LoadState error={error}/>:status==="unconfigured"?<p className="notice">GitHub 登录正在配置，配置完成后即可在这里管理文章。</p>:<><p>只有站主的 GitHub 账号可以管理内容。</p><LoginButton/></>}</main>;
}
function App(){
  const pathname=location.pathname.replace(/\/$/,"")||"/";const section=pathname.slice(1) as Section;const id=new URLSearchParams(location.search).get("post");
  const page=pathname==="/"?<Home/>:pathname==="/admin"?<Admin/>:pathname==="/admin/callback"?<Callback/>:sections.includes(section as typeof sections[number])?id?<Article id={id} section={section}/>:<Collection section={section}/>:<main className="page-frame main-content"><h1>页面不存在</h1><p><a href="/">返回首页</a></p></main>;
  return <div className="page-shell"><Navigation pathname={pathname}/>{page}</div>;
}
createRoot(document.getElementById("root")!).render(<App/>);
