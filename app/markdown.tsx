"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {PrivateImage} from "./private-image";
export function Markdown({ source, admin = false }: { source: string; admin?: boolean }) {
  return <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm,remarkMath]} rehypePlugins={[[rehypeKatex,{trust:false,strict:"ignore"}]]} components={{
    img({src,alt,...props}) { const url=typeof src==="string"?src:""; return <PrivateImage {...props} src={admin ? url.replace(/^\/api\/media\//,"/api/admin/media/") : url} alt={alt??""} loading="lazy" />; },
    a({href,children,...props}) { return <a {...props} href={href} rel="noopener noreferrer">{children}</a>; },
  }}>{source}</ReactMarkdown></div>;
}
