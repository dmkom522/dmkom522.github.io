"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { sectionLabels, type Section } from "@/lib/content";
import {apiFetch,articleUrl} from "@/lib/api-client";
type Hit={id:string;title:string;section:Section;excerpt:string;url:string};
function Search() {
  const [query,setQuery]=useState(""); const [open,setOpen]=useState(false); const [hits,setHits]=useState<Hit[]>([]); const [status,setStatus]=useState<"idle"|"loading"|"done"|"error">("idle");
  const root=useRef<HTMLDivElement>(null); const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{ function outside(event:PointerEvent){if(!root.current?.contains(event.target as Node))setOpen(false);} document.addEventListener("pointerdown",outside); return()=>document.removeEventListener("pointerdown",outside); },[]);
  useEffect(()=>{
    if(!query.trim()){setHits([]);setStatus("idle");return;}
    const controller=new AbortController(); setStatus("loading");
    const timer=setTimeout(async()=>{try {const response=await apiFetch(`/api/search?q=${encodeURIComponent(query)}`,{signal:controller.signal});if(!response.ok)throw new Error();const data=await response.json() as {results:Hit[]};setHits(data.results);setStatus("done");}catch(error){if(!controller.signal.aborted)setStatus("error");}},220);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query]);
  return <div className="site-search" ref={root} onKeyDown={event=>{if(event.key==="Escape"){setOpen(false);input.current?.blur();}}}>
    <form role="search" onSubmit={event=>{event.preventDefault();setOpen(true);input.current?.focus();}}>
      <button className="search-button" type="submit" aria-label="搜索文章"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button>
      <input ref={input} type="search" aria-label="搜索关键词" placeholder="搜索文章" value={query} maxLength={200} onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setOpen(true);}} aria-expanded={open} aria-controls="search-results" autoComplete="off" />
    </form>
    {open&&<div className="search-results" id="search-results" aria-live="polite">
      {status==="idle"&&<p>输入关键词搜索文章</p>}{status==="loading"&&<p>搜索中…</p>}{status==="error"&&<p>暂时无法搜索，请稍后重试。</p>}
      {status==="done"&&(hits.length?<ul>{hits.map(hit=><li key={hit.id}><a href={articleUrl(hit.section,hit.id)} onClick={()=>setOpen(false)}><span className="search-hit-title">{hit.title}</span><small>{sectionLabels[hit.section]}</small><p>{hit.excerpt}</p></a></li>)}</ul>:<p>没有找到相关文章</p>)}
    </div>}
  </div>;
}
export function Navigation({pathname}:{pathname:string}) {
  pathname=pathname.replace(/\/$/,"")||"/";
  return <header className="site-header"><nav className="site-nav" aria-label="主导航">
    {(["notes","paper-reading","projects","about"] as Section[]).map(section=>{const href=section==="about"?"/":`/${section}`;const active=section==="about"?pathname==="/":pathname===href||pathname.startsWith(href+"/");return <a key={section} className="nav-link" href={href} aria-current={active?"page":undefined}>{sectionLabels[section]}</a>;})}
  </nav><div className="header-tools"><Search/><ThemeToggle/></div></header>;
}
