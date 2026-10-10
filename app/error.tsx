"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="page-frame main-content"><h1>暂时无法打开页面</h1><button onClick={reset}>重试</button></main>;}
