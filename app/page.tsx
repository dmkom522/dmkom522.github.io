import { getPost } from "@/lib/server-content";
import { exampleAbout } from "@/lib/content";
import { Markdown } from "./markdown";
export const dynamic="force-dynamic";

export default async function Home() {
  const about=await getPost("about");
  const markdown=about?.has_published?about.published_markdown??"":exampleAbout;
  const avatar=about?.published_avatar?`/api/media/${about.published_avatar}`:"/images/avatar.jpg";
  return (
      <main className="page-frame main-content" id="about" aria-labelledby="about-title">
        <div className="about-heading">
          <img className="avatar-image" src={avatar} width="200" height="200" alt="头像" />
          <div className="about-copy"><h1 id="about-title">{about?.published_title||"About"}</h1><Markdown source={markdown}/></div>
        </div>
      </main>
  );
}
