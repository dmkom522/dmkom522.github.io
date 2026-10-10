"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Markdown } from "@/app/markdown";
import { mediaIds, sectionLabels, sections, type Post, type Section } from "@/lib/content";
import { missingImages, parseMarkdownFile, resolveImages } from "@/lib/markdown-import";
import {apiFetch,apiOrigin} from "@/lib/api-client";
import {PrivateImage} from "@/app/private-image";

type ListPost={id:string;section:Section;title:string;updated_at:number;published_at:number|null;is_published:number};
type ImportState={files:File[];file:File;title:string;markdown:string;section:Section;missing:string[];busy:boolean;error:string};
function signature(post:Post){return JSON.stringify([post.title,post.section,post.draft_markdown,post.draft_avatar]);}
async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  const response=await apiFetch(`/api/admin/${path}`,{...options,headers:{...(options.body instanceof FormData?{}:{"Content-Type":"application/json"}),...options.headers}});
  const data=await response.json() as T&{error?:string};if(!response.ok)throw new Error(data.error||"操作失败，请稍后重试。");return data;
}
function errorText(error:unknown){return error instanceof Error?error.message:"操作失败，请重试。";}

export function AdminEditor({initialized,signOutUrl,onSignOut}:{initialized:boolean;signOutUrl:string;onSignOut?:()=>Promise<void>}){
  const [posts,setPosts]=useState<ListPost[]>([]);const [post,setPost]=useState<Post|null>(null);
  const latest=useRef<Post|null>(null);const savedSignature=useRef("");const saving=useRef<Promise<boolean>|null>(null);
  const [saveStatus,setSaveStatus]=useState("准备编辑");const [error,setError]=useState("");const [working,setWorking]=useState("");
  const [pane,setPane]=useState<"edit"|"preview">("edit");const [recovery,setRecovery]=useState<Post|null>(null);
  const [withdrawConfirm,setWithdrawConfirm]=useState(false);
  const [deleteConfirm,setDeleteConfirm]=useState(false);
  const [importState,setImportState]=useState<ImportState|null>(null);const importCache=useRef(new WeakMap<File,string>());
  const textarea=useRef<HTMLTextAreaElement>(null);const imagesInput=useRef<HTMLInputElement>(null);const avatarInput=useRef<HTMLInputElement>(null);const importInput=useRef<HTMLInputElement>(null);const folderInput=useRef<HTMLInputElement>(null);const repairInput=useRef<HTMLInputElement>(null);
  const saveFunction=useRef<(force?:boolean)=>Promise<boolean>>(async()=>false);
  const dirty=Boolean(post&&signature(post)!==savedSignature.current);
  const missing=post?missingImages(post.draft_markdown):[];

  function setCurrent(next:Post|null){if(latest.current?.id!==next?.id){setWithdrawConfirm(false);setDeleteConfirm(false);}latest.current=next;setPost(next);}
  function backup(next:Post){try{localStorage.setItem(`blog-draft-${next.id}`,JSON.stringify({...next,backup_at:Date.now()}));}catch{}}
  function edit(patch:Partial<Post>){if(!latest.current)return;const next={...latest.current,...patch};setCurrent(next);backup(next);setSaveStatus("等待保存…");}
  const loadList=useCallback(async()=>{const data=await api<{posts:ListPost[]}>("posts");setPosts(data.posts);},[]);
  async function openPost(id:string,preserveBackup=false){
    if(!preserveBackup&&latest.current&&signature(latest.current)!==savedSignature.current&&!await saveFunction.current())return;
    setWorking("打开文章");setError("");setRecovery(null);
    try{const {post:next}=await api<{post:Post}>(`posts/${id}`);savedSignature.current=signature(next);setCurrent(next);setSaveStatus("草稿已加载");
      try{const raw=localStorage.getItem(`blog-draft-${id}`);if(raw){const draft=JSON.parse(raw) as Post;if(draft.id===id&&typeof draft.draft_markdown==="string"&&signature(draft)!==signature(next))setRecovery(draft);}}catch{}
    }catch(reason){setError(errorText(reason));}finally{setWorking("");}
  }
  async function saveDraft(force=false):Promise<boolean>{
    if(recovery){setError("请先选择恢复本机内容或使用服务器版本。");return false;}
    if(saving.current)return saving.current;
    const current=latest.current;if(!current)return false;
    const sent={...current};const sentSignature=signature(sent);if(!force&&sentSignature===savedSignature.current)return true;
    setSaveStatus("正在保存…");setError("");
    const operation=(async()=>{try{
      const {post:stored}=await api<{post:Post}>(`posts/${sent.id}`,{method:"PUT",body:JSON.stringify({title:sent.title,section:sent.section,markdown:sent.draft_markdown,avatar:sent.draft_avatar,revision:sent.revision})});
      savedSignature.current=sentSignature;
      if(latest.current?.id===stored.id){const next={...latest.current,revision:stored.revision,updated_at:stored.updated_at,draft_version:stored.draft_version};setCurrent(next);
        if(signature(next)===sentSignature){try{localStorage.removeItem(`blog-draft-${next.id}`);}catch{}setSaveStatus(`已保存 · ${new Date(stored.updated_at).toLocaleTimeString("zh-CN",{hour12:false,timeZone:"Asia/Shanghai"})}`);}else{backup(next);setSaveStatus("等待保存…");}}
      void loadList().catch(()=>{});return true;
    }catch(reason){if(latest.current)backup(latest.current);setSaveStatus("保存失败 · 内容已保留");setError(errorText(reason));return false;}finally{saving.current=null;}})();
    saving.current=operation;return operation;
  }
  saveFunction.current=saveDraft;
  async function flushSave(force=false){if(saving.current&&!await saving.current)return false;for(let i=0;i<3;i++){const current=latest.current;if(!current)return false;if(!force&&signature(current)===savedSignature.current)return true;if(!await saveDraft(force))return false;force=false;}return latest.current?signature(latest.current)===savedSignature.current:false;}

  useEffect(()=>{folderInput.current?.setAttribute("webkitdirectory","");if(!initialized)return;void loadList().catch(reason=>setError(errorText(reason)));void openPost("about");},[initialized,loadList]);
  useEffect(()=>{if(!post||!dirty||recovery||deleteConfirm)return;const timer=setTimeout(()=>void saveFunction.current(),900);return()=>clearTimeout(timer);},[post?.title,post?.section,post?.draft_markdown,post?.draft_avatar,post?.revision,dirty,recovery,deleteConfirm]);
  useEffect(()=>{const beforeUnload=(event:BeforeUnloadEvent)=>{if(latest.current&&signature(latest.current)!==savedSignature.current){backup(latest.current);event.preventDefault();event.returnValue="";}};window.addEventListener("beforeunload",beforeUnload);return()=>window.removeEventListener("beforeunload",beforeUnload);},[]);

  async function bindOwner(){setWorking("绑定站主");setError("");try{await api("initialize",{method:"POST",body:"{}"});location.reload();}catch(reason){setError(errorText(reason));setWorking("");}}
  async function newPost(section:Section="notes"){
    if(latest.current&&!await flushSave())return null;setError("");
    try{const {post:next}=section==="about"?await api<{post:Post}>("posts/about"):await api<{post:Post}>("posts",{method:"POST",body:JSON.stringify({section})});savedSignature.current=signature(next);setCurrent(next);setRecovery(null);setSaveStatus("草稿已加载");await loadList();return next;}catch(reason){setError(errorText(reason));return null;}
  }
  async function publish(){
    setWorking("发布");setError("");try{
      if(!await flushSave(true))return;const current=latest.current;if(!current)return;
      if(missingImages(current.draft_markdown).length)throw new Error("请先补齐本地配图，再发布文章。");
      const {post:stored}=await api<{post:Post}>(`posts/${current.id}/publish`,{method:"POST",body:JSON.stringify({revision:current.revision})});
      if(latest.current?.id===stored.id)setCurrent({...latest.current,published_title:stored.published_title,published_markdown:stored.published_markdown,published_avatar:stored.published_avatar,published_section:stored.published_section,published_at:stored.published_at,has_published:stored.has_published});
      setSaveStatus("已发布");await loadList();
    }catch(reason){setError(errorText(reason));}finally{setWorking("");}
  }
  async function unpublish(){
    if(!latest.current)return;setWithdrawConfirm(false);
    setWorking("撤回");setError("");try{
      if(!await flushSave())return;const current=latest.current!;const {post:stored}=await api<{post:Post}>(`posts/${current.id}/unpublish`,{method:"POST",body:JSON.stringify({revision:current.revision})});
      if(latest.current?.id===stored.id)setCurrent({...latest.current,published_title:null,published_markdown:null,published_avatar:null,published_section:null,published_at:null});setSaveStatus("已撤回 · 草稿保留");await loadList();
    }catch(reason){setError(errorText(reason));}finally{setWorking("");}
  }
  async function deleteDraft(){
    const current=latest.current;
    if(!current||current.id==="about"||current.published_markdown!==null)return;
    setWorking("删除草稿");setError("");
    try{
      if(saving.current)await saving.current;
      const {post:stored}=await api<{post:Post}>(`posts/${current.id}`);
      if(stored.published_markdown!==null)throw new Error("这篇文章已发布，请先撤回发布。");
      const images=new Set([...mediaIds(stored.draft_markdown,stored.draft_avatar),...mediaIds(current.draft_markdown,current.draft_avatar)]);
      await api(`posts/${current.id}`,{method:"DELETE"});
      try{localStorage.removeItem(`blog-draft-${current.id}`);}catch{}
      savedSignature.current="";setCurrent(null);setRecovery(null);setSaveStatus("草稿已删除");
      let failed=false;
      for(const id of images){try{await api(`media/${id}`,{method:"DELETE"});}catch(reason){if(!errorText(reason).includes("仍被文章引用"))failed=true;}}
      await loadList();
      if(failed)setError("草稿已删除，部分配图清理失败。请稍后重试或联系站点维护者。");
    }catch(reason){setError(errorText(reason));}finally{setDeleteConfirm(false);setWorking("");}
  }
  function insert(before:string,after="",placeholder="文字"){
    const current=latest.current;if(!current)return;const input=textarea.current;const start=input?.selectionStart??current.draft_markdown.length;const end=input?.selectionEnd??start;const selection=current.draft_markdown.slice(start,end)||placeholder;
    edit({draft_markdown:current.draft_markdown.slice(0,start)+before+selection+after+current.draft_markdown.slice(end)});setPane("edit");
    requestAnimationFrame(()=>{textarea.current?.focus();textarea.current?.setSelectionRange(start+before.length,start+before.length+selection.length);});
  }
  async function uploadFile(file:File){
    if(file.size>8*1024*1024)throw new Error(`${file.name} 超过 8 MB。`);const data=new FormData();data.set("file",file);return api<{id:string;url:string;name:string}>("media",{method:"POST",body:data});
  }
  async function insertImage(event:ChangeEvent<HTMLInputElement>,avatar=false){
    const file=event.target.files?.[0];event.target.value="";if(!file)return;setWorking("上传图片");setError("");
    try{const uploaded=await uploadFile(file);if(avatar)edit({draft_avatar:uploaded.id});else insert(`\n![${file.name.replace(/[\[\]]/g,"")}](${uploaded.url})\n`,"","");}catch(reason){setError(errorText(reason));}finally{setWorking("");}
  }
  async function cachedUpload(file:File){const cached=importCache.current.get(file);if(cached)return cached;const uploaded=await uploadFile(file);importCache.current.set(file,uploaded.url);return uploaded.url;}
  async function prepareImport(file:File,files:File[],section:Section="notes"){
    setImportState({files,file,title:"",markdown:"",section,missing:[],busy:true,error:""});
    try{if(file.size>2_000_000)throw new Error("Markdown 文件不能超过 2 MB。");const parsed=parseMarkdownFile(await file.text(),file.name);const resolved=await resolveImages(parsed.markdown,files.filter(item=>!(/\.(md|markdown)$/i.test(item.name))),cachedUpload);setImportState({files,file,title:parsed.title,markdown:resolved.markdown,section,missing:resolved.missing,busy:false,error:""});}
    catch(reason){setImportState(current=>current?{...current,busy:false,error:errorText(reason)}:null);}
  }
  function chooseImport(event:ChangeEvent<HTMLInputElement>){const files=Array.from(event.target.files??[]);event.target.value="";const md=files.find(file=>/\.(md|markdown)$/i.test(file.name));if(!md){setError("请选择 Markdown 文件，可同时附上配图。");return;}void prepareImport(md,files,post?.section==="about"?"notes":post?.section??"notes");}
  async function confirmImport(){
    if(!importState||importState.busy||importState.error)return;setWorking("导入文章");
    try{const next=await newPost(importState.section);if(!next)return;edit({title:importState.title,draft_markdown:importState.markdown});await saveDraft(true);setImportState(null);setPane("edit");}finally{setWorking("");}
  }
  async function repairImages(event:ChangeEvent<HTMLInputElement>){const files=Array.from(event.target.files??[]);event.target.value="";if(!latest.current||!files.length)return;setWorking("匹配配图");setError("");try{const resolved=await resolveImages(latest.current.draft_markdown,files,cachedUpload);edit({draft_markdown:resolved.markdown});if(resolved.missing.length)setError(`仍缺少配图：${resolved.missing.join("、")}`);}catch(reason){setError(errorText(reason));}finally{setWorking("");}}
  function exportMarkdown(){const current=latest.current;if(!current)return;const markdown=current.draft_markdown.replaceAll("](/api/media/",`](${apiOrigin||location.origin}/api/media/`);const text=`---\ntitle: ${JSON.stringify(current.title)}\nsection: ${current.section}\n---\n\n${markdown}\n`;const url=URL.createObjectURL(new Blob([text],{type:"text/markdown;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=(current.title||"untitled").replace(/[<>:"/\\|?*]/g,"_")+".md";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

  if(!initialized)return <main className="admin-page"><h1>绑定站主</h1><p>当前账号已通过站主身份核对。绑定后，只有这个账号能管理内容，初始化入口会自动关闭。</p>{error&&<p className="notice" role="alert">{error}</p>}<button className="button primary" onClick={bindOwner} disabled={Boolean(working)}>{working||"绑定当前账号"}</button></main>;
  return <main className="admin-page"><div className="admin-heading"><h1>内容管理</h1>{onSignOut?<button className="text-button" onClick={()=>void (async()=>{try{if(latest.current&&!await flushSave())return;await onSignOut();}catch(reason){setError(errorText(reason));}})()}>退出登录</button>:<a href={signOutUrl} target="_top">退出登录</a>}</div>
    <input hidden type="file" ref={imagesInput} accept="image/jpeg,image/png,image/webp,image/gif" onChange={event=>void insertImage(event)}/>
    <input hidden type="file" ref={avatarInput} accept="image/jpeg,image/png,image/webp,image/gif" onChange={event=>void insertImage(event,true)}/>
    <input hidden type="file" ref={importInput} multiple accept=".md,.markdown,image/jpeg,image/png,image/webp,image/gif" onChange={chooseImport}/>
    <input hidden type="file" ref={folderInput} multiple onChange={chooseImport}/>
    <input hidden type="file" ref={repairInput} multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={event=>void repairImages(event)}/>
    <div className="admin-layout"><aside className="admin-sidebar" aria-label="文章管理">
      <button className="button" disabled={Boolean(working)} onClick={()=>void newPost()}>新建文章</button>
      <button className="button" disabled={Boolean(working)} onClick={()=>importInput.current?.click()}>导入 Markdown＋配图</button>
      <button className="button" disabled={Boolean(working)} onClick={()=>folderInput.current?.click()}>导入文章文件夹</button>
      <ul className="admin-post-list"><li><button aria-current={post?.id==="about"?"true":undefined} onClick={()=>void openPost("about")} disabled={Boolean(working)}>About<small>首页简介与头像</small></button></li>
      {posts.filter(item=>item.id!=="about").map(item=><li key={item.id}><button aria-current={post?.id===item.id?"true":undefined} onClick={()=>void openPost(item.id)} disabled={Boolean(working)}>{item.title||"无标题草稿"}<small>{sectionLabels[item.section]} · {item.is_published?"已发布":"草稿"}</small></button></li>)}</ul>
    </aside><section className="editor-area" aria-label="Markdown 编辑器">
      {error&&<div className="notice" role="alert"><p>{error}</p>{error.includes("其他窗口更新")&&post&&<button className="button" onClick={()=>void openPost(post.id,true)}>重新读取并恢复本机内容</button>}</div>}
      {recovery&&<div className="notice"><p>本机还有未同步的编辑内容。恢复后可以继续保存，也可以先导出备份。</p><button className="button" onClick={()=>{const current=latest.current!;edit({title:recovery.title,section:recovery.section,draft_markdown:recovery.draft_markdown,draft_avatar:recovery.draft_avatar,revision:current.revision});setRecovery(null);}}>恢复本机内容</button> <button className="button" onClick={()=>{try{localStorage.removeItem(`blog-draft-${recovery.id}`);}catch{}setRecovery(null);}}>使用服务器版本</button></div>}
      {post&&<><div className="editor-meta"><input aria-label="文章标题" placeholder="文章标题" value={post.title} maxLength={200} onChange={event=>edit({title:event.target.value})}/>{post.id!=="about"&&<select aria-label="文章栏目" value={post.section} onChange={event=>edit({section:event.target.value as Section})}>{sections.map(section=><option value={section} key={section}>{sectionLabels[section]}</option>)}</select>}</div>
      <div className="editor-actions"><span className="save-status" role="status">{saveStatus}{dirty?" · 有未保存修改":""}</span><button className="button" onClick={()=>void saveDraft(true)} disabled={Boolean(working)}>保存草稿</button><button className="button" onClick={exportMarkdown}>导出 Markdown</button><button className="button primary" onClick={()=>void publish()} disabled={Boolean(working)||missing.length>0||Boolean(recovery)}>{working==="发布"?"正在发布…":post.published_markdown!==null?"更新发布":"发布"}</button>{post.published_markdown!==null&&<button className="button" onClick={()=>setWithdrawConfirm(true)} disabled={Boolean(working)}>撤回发布</button>}</div>
      {post.id!=="about"&&post.published_markdown===null&&<button className="text-button" disabled={Boolean(working)||Boolean(recovery)} onClick={()=>setDeleteConfirm(true)}>删除草稿</button>}
      {deleteConfirm&&<div className="notice" role="alertdialog" aria-label="确认删除草稿"><p>永久删除“{post.title||"无标题草稿"}”及其本机备份，并清理它引用的配图。其他文章仍引用的图片会保留。</p><button className="button" disabled={Boolean(working)} onClick={()=>setDeleteConfirm(false)}>取消</button> <button className="button" disabled={Boolean(working)} onClick={()=>void deleteDraft()}>确认删除草稿</button></div>}
      {withdrawConfirm&&<div className="notice" role="alertdialog" aria-label="确认撤回发布"><p>撤回后，游客将无法阅读这篇内容。草稿会保留。</p><button className="button" onClick={()=>setWithdrawConfirm(false)}>取消</button> <button className="button" onClick={()=>void unpublish()} disabled={Boolean(working)}>确认撤回</button></div>}
      {post.published_markdown!==null&&<p className="save-status">当前为已发布内容的草稿。编辑和保存不会改变线上版本，点击“更新发布”后才会生效。</p>}
      {post.id==="about"&&<div className="profile-avatar"><PrivateImage src={post.draft_avatar?`/api/admin/media/${post.draft_avatar}`:"/images/avatar.jpg"} alt="头像预览"/><button className="button" onClick={()=>avatarInput.current?.click()} disabled={Boolean(working)}>上传头像</button>{post.draft_avatar&&<button className="button" onClick={()=>edit({draft_avatar:null})}>使用原图</button>}<span className="save-status">随 About 一起发布</span></div>}
      {missing.length>0&&<div className="notice" role="alert"><p>缺少本地配图：{missing.join("、")}。补齐前可以保存草稿，暂不能发布。</p><button className="button" onClick={()=>repairInput.current?.click()} disabled={Boolean(working)}>选择配图并匹配</button></div>}
      <div className="editor-toolbar" aria-label="格式工具"><button onClick={()=>insert("**","**")}>粗体</button><button onClick={()=>insert("*","*")}>斜体</button><button onClick={()=>insert("\n## ","\n","标题")}>标题</button><button onClick={()=>insert("[","](https://example.com)","链接文字")}>链接</button><button onClick={()=>insert("\n- ","\n","列表项")}>列表</button><button onClick={()=>insert("\n- [ ] ","\n","待办事项")}>待办</button><button onClick={()=>insert("\n| 列一 | 列二 |\n| --- | --- |\n| "," | 内容 |\n","内容")}>表格</button><button onClick={()=>insert("\n```\n","\n```\n","代码")}>代码</button><button onClick={()=>insert("$","$","x^2")}>公式</button><button onClick={()=>imagesInput.current?.click()} disabled={Boolean(working)}>上传图片</button></div>
      <div className="editor-tabs" role="tablist" aria-label="编辑视图"><button role="tab" aria-selected={pane==="edit"} onClick={()=>setPane("edit")}>编辑</button><button role="tab" aria-selected={pane==="preview"} onClick={()=>setPane("preview")}>预览</button></div>
      <div className="editor-panes"><textarea ref={textarea} className="editor-source" data-visible={pane==="edit"} aria-label="Markdown 正文" value={post.draft_markdown} onChange={event=>edit({draft_markdown:event.target.value})} spellCheck={false} placeholder="开始写作…"/><div className="editor-preview" data-visible={pane==="preview"} aria-label="文章预览"><Markdown source={post.draft_markdown} admin/></div></div></>}
    </section></div>
    {importState&&<div className="modal-backdrop"><section className="import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title"><h2 id="import-title">导入 Markdown</h2>
      {importState.files.filter(file=>/\.(md|markdown)$/i.test(file.name)).length>1&&<label>选择文章<select aria-label="选择导入文章" value={importState.file.name} disabled={importState.busy} onChange={event=>{const file=importState.files.find(item=>item.name===event.target.value);if(file)void prepareImport(file,importState.files,importState.section);}}>{importState.files.filter(file=>/\.(md|markdown)$/i.test(file.name)).map(file=><option value={file.name} key={file.webkitRelativePath||file.name}>{file.webkitRelativePath||file.name}</option>)}</select></label>}
      <label>导入栏目<select aria-label="导入栏目" value={importState.section} disabled={importState.busy} onChange={event=>setImportState({...importState,section:event.target.value as Section})}>{[...sections,"about" as const].map(section=><option key={section} value={section}>{sectionLabels[section]}</option>)}</select></label>
      {importState.busy?<p role="status">正在读取 Markdown 并上传配图…</p>:<><strong>{importState.title}</strong>{importState.error&&<p className="notice" role="alert">{importState.error}</p>}{importState.missing.length>0&&<p className="notice">缺少配图：{importState.missing.join("、")}。可以先导入草稿，再补齐图片。</p>}<Markdown source={importState.markdown} admin/></>}
      <div className="editor-actions"><button className="button" disabled={importState.busy||Boolean(working)} onClick={()=>setImportState(null)}>取消</button><button className="button primary" disabled={importState.busy||Boolean(importState.error)||Boolean(working)} onClick={()=>void confirmImport()}>导入为草稿</button></div>
    </section></div>}
  </main>;
}
