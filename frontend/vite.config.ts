import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {fileURLToPath} from "node:url";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
const root=fileURLToPath(new URL("../",import.meta.url));
const api=process.env.VITE_BLOG_API_ORIGIN||"https://dmkom-notebook.hushed-finch-2944.chatgpt.site";
if(!/^https?:\/\/[^/]+$/.test(api))throw new Error("VITE_BLOG_API_ORIGIN 必须是完整源地址");
export default defineConfig({
  root:root+"frontend",publicDir:root+"public",base:"/",
  resolve:{alias:{"@":root}},define:{"import.meta.env.VITE_BLOG_API_ORIGIN":JSON.stringify(api)},
  server:{host:"127.0.0.1",port:5175,strictPort:true,fs:{allow:[root]}},
  build:{outDir:root+"pages-dist",emptyOutDir:true},
  plugins:[react(),{name:"static-routes",transformIndexHtml(html){return html.replace("__API_ORIGIN__",api);},closeBundle(){
    const output=root+"pages-dist";const html=readFileSync(output+"/index.html","utf8");
    for(const route of ["notes","paper-reading","projects","admin","admin/callback"]){mkdirSync(output+"/"+route,{recursive:true});writeFileSync(output+"/"+route+"/index.html",html);}
    writeFileSync(output+"/404.html",html);writeFileSync(output+"/.nojekyll","");
  }}],
});
