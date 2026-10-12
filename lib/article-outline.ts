import {unified} from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import {visit} from "unist-util-visit";
import type {Root} from "mdast";

export type OutlineItem={id:string;title:string;depth:number;children:OutlineItem[]};
const punctuation=new RegExp("[^\\p{L}\\p{N}\\p{M}\\s_-]","gu");

function collectHeadings(tree:Root){
  const headings:OutlineItem[]=[];const used=new Set<string>();
  visit(tree,"heading",node=>{
    let title="";
    visit(node,child=>{
      if(child.type==="image"||child.type==="imageReference")title+=child.alt??"";
      else if("value" in child&&typeof child.value==="string"&&child.type!=="html")title+=child.value;
    });
    title=title.replace(/\s+/g," ").trim()||"未命名标题";
    const slug=title.normalize("NFKC").toLowerCase().replace(punctuation,"").trim().replace(/\s+/g,"-")||"section";
    const base=`heading-${slug}`;let id=base;let suffix=2;
    while(used.has(id))id=`${base}-${suffix++}`;
    used.add(id);
    node.data={...node.data,hProperties:{...node.data?.hProperties,id,"data-outline-heading":true}};
    headings.push({id,title,depth:node.depth,children:[]});
  });
  return headings;
}

export function remarkHeadingAnchors(){return (tree:Root)=>{collectHeadings(tree);};}

export function articleOutline(source:string){
  const tree=unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(source);
  const roots:OutlineItem[]=[];const stack:OutlineItem[]=[];
  for(const item of collectHeadings(tree)){
    while(stack.length&&stack[stack.length-1].depth>=item.depth)stack.pop();
    if(stack.length)stack[stack.length-1].children.push(item);else roots.push(item);
    stack.push(item);
  }
  return roots;
}
