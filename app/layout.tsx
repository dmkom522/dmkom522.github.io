import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { SiteHeader } from "./site-header";

export const metadata: Metadata = {
  title: {default:"About",template:"%s · 个人博客"},
  description: "学习笔记、论文阅读与项目记录。",
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.svg" },
};

const themeBootstrap = `(()=>{let theme="light";try{if(localStorage.getItem("blog-theme")==="dark")theme="dark"}catch{}document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-theme="light" suppressHydrationWarning>
      <head>
        <script id="theme-bootstrap" dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <link rel="preload" href="/fonts/noto-sans-sc-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body><div className="page-shell"><SiteHeader/>{children}<footer className="site-footer"><a href="/admin">管理</a></footer></div></body>
    </html>
  );
}
