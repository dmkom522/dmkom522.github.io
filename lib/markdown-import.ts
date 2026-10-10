import { parse as parseYaml } from "yaml";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { visit } from "unist-util-visit";

type ImageRef={url:string;alt:string;title?:string;start:number;end:number};
export function normalizeObsidian(markdown:string) {
  return markdown.replace(/!\[\[([^\]\n]+)\]\]/g,(_match,value:string)=>{const [path,label]=value.split("|");const alt=label&&!/^\d+(x\d+)?$/.test(label)?label:path.split(/[\\/]/).pop()??"";return `![${alt.replace(/[\[\]]/g,"")}](<${path.trim()}>)`;});
}
function imageRefs(markdown:string):ImageRef[] {
  const tree=unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(markdown);
  const definitions=new Map<string,{url:string;title?:string}>();
  visit(tree,"definition",node=>{definitions.set(node.identifier.toLowerCase(),{url:node.url,title:node.title??undefined});});
  const refs:ImageRef[]=[];
  visit(tree,node=>{
    if(node.type!=="image"&&node.type!=="imageReference")return;
    const data=node.type==="image"?node:definitions.get(node.identifier.toLowerCase());
    if(!data||node.position?.start.offset===undefined||node.position.end.offset===undefined)return;
    refs.push({url:data.url,alt:node.alt??"",title:data.title??undefined,start:node.position.start.offset,end:node.position.end.offset});
  }); return refs;
}
function remote(url:string){return /^(?:https?:\/\/|\/api\/media\/)/i.test(url);}
function normalizePath(path:string){try{path=decodeURIComponent(path);}catch{}return path.replace(/\\/g,"/").split(/[?#]/)[0].replace(/^(?:\.\.\/|\.\/|\/)+/,"").toLocaleLowerCase();}
export function missingImages(markdown:string){return [...new Set(imageRefs(normalizeObsidian(markdown)).filter(ref=>!remote(ref.url)).map(ref=>ref.url))];}
export function parseMarkdownFile(text:string,filename:string) {
  let markdown=text.replace(/^\uFEFF/,"");let metadataTitle="";
  const frontmatter=markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if(frontmatter){const metadata=parseYaml(frontmatter[1],{maxAliasCount:20});if(metadata&&typeof metadata.title==="string")metadataTitle=metadata.title.trim();markdown=markdown.slice(frontmatter[0].length);}
  const tree=unified().use(remarkParse).parse(markdown);let heading="";
  visit(tree,"heading",node=>{if(!heading)visit(node,child=>{if("value" in child&&typeof child.value==="string")heading+=child.value;});});
  const title=metadataTitle||heading.trim()||filename.replace(/\.(md|markdown)$/i,"");
  if(title.length>200)throw new Error("文章标题不能超过 200 个字符。");
  if(markdown.length>1_000_000)throw new Error("Markdown 正文不能超过 1 MB。");
  return {title,markdown:normalizeObsidian(markdown)};
}
export async function resolveImages(markdown:string,files:File[],upload:(file:File)=>Promise<string>) {
  markdown=normalizeObsidian(markdown);const refs=imageRefs(markdown);const resolved=new Map<File,string>();const replacements:{start:number;end:number;text:string}[]=[];
  const missing:string[]=[];
  for(const ref of refs){
    if(remote(ref.url))continue;
    const path=normalizePath(ref.url);
    let matches=files.filter(file=>{const candidate=normalizePath(file.webkitRelativePath||file.name);return candidate===path||candidate.endsWith("/"+path)||path.endsWith("/"+candidate);});
    if(!matches.length)matches=files.filter(file=>normalizePath(file.name)===path.split("/").pop());
    if(matches.length!==1){missing.push(ref.url+(matches.length>1?"（存在同名图片）":""));continue;}
    const file=matches[0];let url=resolved.get(file);if(!url){url=await upload(file);resolved.set(file,url);}
    replacements.push({start:ref.start,end:ref.end,text:`![${ref.alt.replace(/[\\\[\]]/g,"\\$&")}](${url}${ref.title?` ${JSON.stringify(ref.title)}`:""})`});
  }
  for(const replacement of replacements.sort((a,b)=>b.start-a.start))markdown=markdown.slice(0,replacement.start)+replacement.text+markdown.slice(replacement.end);
  return {markdown,missing:[...new Set(missing)]};
}
