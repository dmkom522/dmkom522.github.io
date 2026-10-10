import { requireChatGPTUser, chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { ownerId } from "@/lib/server-content";
import { canInitialize } from "@/lib/admin-server";
import { AdminEditor } from "./editor";
export const dynamic="force-dynamic";
export const metadata={title:"管理",robots:{index:false,follow:false}};
export default async function Admin(){
  const user=await requireChatGPTUser("/admin");const owner=await ownerId();
  if(owner&&owner!==user.userId||!owner&&!await canInitialize(user))return <main className="page-frame main-content"><h1>无法访问后台</h1><p>只有站主可以管理内容。</p><a href={chatGPTSignOutPath("/")} target="_top">退出登录</a></main>;
  return <AdminEditor initialized={Boolean(owner)} signOutUrl={chatGPTSignOutPath("/")}/>;
}
