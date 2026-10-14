"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {Markdown} from "./markdown";
import {articleOutline,type OutlineItem} from "@/lib/article-outline";
import {formatDate,type PublicPost} from "@/lib/content";

function containsHeading(item:OutlineItem,id:string):boolean{return item.id===id||item.children.some(child=>containsHeading(child,id));}
function ancestors(items:OutlineItem[],id:string,path:string[]=[]):string[]|null{
  for(const item of items){if(item.id===id)return path;const result=ancestors(item.children,id,[...path,item.id]);if(result)return result;}
  return null;
}
function Chevron(){return <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m5 3 5 5-5 5"/></svg>;}

export function ArticleReading({post}:{post:PublicPost}){
  const outline=useMemo(()=>articleOutline(post.markdown),[post.markdown]);
  const prose=useRef<HTMLElement>(null);
  const [active,setActive]=useState("");const [collapsed,setCollapsed]=useState<Set<string>>(new Set());const [mobileOpen,setMobileOpen]=useState(false);

  useEffect(()=>{
    setCollapsed(new Set());setMobileOpen(false);
    const headings=Array.from(prose.current?.querySelectorAll<HTMLElement>("[data-outline-heading]")??[]);
    let frame=0;
    function update(){
      frame=0;let current=headings[0]?.id??"";
      for(const heading of headings){if(heading.getBoundingClientRect().top>64)break;current=heading.id;}
      if(window.scrollY>0&&window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-4)current=headings[headings.length-1]?.id??current;
      setActive(current);
    }
    function onScroll(){if(!frame)frame=requestAnimationFrame(update);}
    function onHash(){
      let id="";try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
      const path=ancestors(outline,id);if(!path)return;
      setCollapsed(current=>new Set([...current].filter(item=>!path.includes(item))));
      headings.find(heading=>heading.id===id)?.scrollIntoView({block:"start"});setActive(id);
    }
    update();onHash();
    window.addEventListener("scroll",onScroll,{passive:true});window.addEventListener("resize",onScroll);window.addEventListener("hashchange",onHash);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener("scroll",onScroll);window.removeEventListener("resize",onScroll);window.removeEventListener("hashchange",onHash);};
  },[outline]);

  function toggle(id:string){setCollapsed(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next;});}
  function renderItems(items:OutlineItem[]){return <ul>{items.map(item=>{
    const folded=collapsed.has(item.id);const selected=item.id===active||(folded&&containsHeading(item,active));
    return <li key={item.id}><div className="outline-row" data-active={selected||undefined}>
      {item.children.length?<button className="outline-branch" aria-label={`${folded?"展开":"折叠"}“${item.title}”的子标题`} aria-expanded={!folded} aria-controls={`outline-children-${item.id}`} onClick={()=>toggle(item.id)}><Chevron/></button>:<span className="outline-leaf" aria-hidden="true"/>}
      <a href={`#${item.id}`} aria-current={item.id===active?"location":undefined}>{item.title}</a>
    </div>{item.children.length>0&&<div id={`outline-children-${item.id}`} hidden={folded}>{renderItems(item.children)}</div>}</li>;
  })}</ul>;}

  return <div className={`article-layout${outline.length?" has-outline":""}`}>
    <article className="article-prose" ref={prose}><h1>{post.title}</h1><div className="article-date"><span>写于 <time dateTime={new Date(post.created_at).toISOString()}>{formatDate(post.created_at)}</time></span><span>最后编辑于 <time dateTime={new Date(post.updated_at).toISOString()}>{formatDate(post.updated_at)}</time></span></div><Markdown source={post.markdown} headingAnchors/></article>
    {outline.length>0&&<aside className="article-outline" data-mobile-open={mobileOpen}>
      <h2 className="outline-heading">目录</h2>
      <button className="outline-mobile-toggle" aria-expanded={mobileOpen} aria-controls="article-outline-nav" onClick={()=>setMobileOpen(!mobileOpen)}>目录<Chevron/></button>
      <nav id="article-outline-nav" aria-label="文章目录">{renderItems(outline)}</nav>
    </aside>}
  </div>;
}
