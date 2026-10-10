# 个人博客

阅读入口：https://dmkom522.github.io/

管理入口：https://dmkom522.github.io/admin/

源码仓库：https://github.com/dmkom522/dmkom522.github.io

前台托管在 GitHub Pages；独立后端使用 Sites D1 / R2。浏览器地址显示 github.io，后台数据请求使用已有的 chatgpt.site 服务地址。

## 写作与上传

1. 打开管理入口，用站主 `dmkom522` 的 GitHub 账号登录。其他账号无法管理内容。
2. 点击「新建文章」，选择 notes、paper reading 或 projects。也可以点击「导入 Markdown＋配图」，同时选择文章和图片；整个目录可用「导入文章文件夹」。
3. 导入窗口会预览文章。标题依次取 YAML 元数据中的 `title`、第一个标题、文件名。Obsidian 的 `![[图片]]` 会转成普通 Markdown 图片。
4. 编辑时自动保存草稿，状态显示在编辑区上方；也可以手动点击「保存草稿」。桌面端左右预览，窄屏切换「编辑 / 预览」。支持表格、任务列表、代码块、行内 `$公式$` 和块级 `$$公式$$`。
5. 点击「发布」才让读者看到内容。后续修改仍为草稿，点击「更新发布」更新线上版本；「撤回发布」隐藏文章并保留草稿。内容更新不需要重新部署。

首页的文字与头像在「About」中编辑，头像和简介一起发布。配图支持 JPG、PNG、WebP、GIF，每张最多 8 MB。

未发布的文章和配图仅站主可读。搜索只检索已发布文章的标题和正文，多个关键词以空格分隔。

## 缺图、冲突与备份

- 导入时尽量保留 Markdown 中的相对路径。路径无法精确匹配时，仅在文件名唯一的情况下匹配；缺图会明确提示，补齐前可保存草稿，不能发布。
- 保存失败时保留当前文字，并尽力备份到当前浏览器。网络恢复后重试；版本冲突时选择「重新读取并恢复本机内容」。清除浏览器数据会删除本机备份，服务端已保存草稿不受影响。
- 「导出 Markdown」导出当前文字和图片链接。图片文件仍保存在网站上，导出文件不包含离线图片包。
- 撤回后新的图片请求不再公开返回。已经被读者下载或截屏的内容无法追回。

## 维护

文章及发布快照保存在 Sites D1，图片保存在 R2，主题选择保存在浏览器。数据库迁移只定义空表和字段，没有示例文章。首页保留用户要求的示例简介和上传头像。

源码分为 `frontend/`（GitHub Pages React 前台）和 `app/`、`lib/`（Sites Vinext 后端及共享组件）。`npm run dev:pages` 启动前台预览，`npm run build:pages` 输出到 `pages-dist/`；推送 `main` 后由 GitHub Actions 自动更新网页。仓库 Settings → Pages → Source 使用 GitHub Actions。

`npm run dev`、`npm run build` 用于后端；后端正式发布使用 Sites 插件。修改后端接口需要单独部署；日常保存、发布和撤回文章无需构建网页。`.dev.vars`、`.wrangler`、`.sites-runtime`、`pages-dist` 和账号密钥均不进入源码仓库。

后端运行时变量：`FRONTEND_ORIGIN=https://dmkom522.github.io`、`OWNER_GITHUB_ID=298178811`、`GITHUB_CLIENT_ID` 和保密的 `GITHUB_CLIENT_SECRET`。OAuth App 回调地址是 `https://dmkom522.github.io/admin/callback/`。Client Secret 只配置在后端，不放在 GitHub 仓库或 Actions。前台只需要公开的 API 源地址 `VITE_BLOG_API_ORIGIN`，默认值已写在 Vite 配置中。

GitHub 登录使用 state 和 PKCE，后端核对 GitHub 返回的稳定账号 ID，只为站主签发会话。会话令牌只在当前标签页保存，服务端保存其哈希，7 天过期；退出登录会撤销会话。GitHub access token 仅用于当次身份核对，不存入数据库。原 Sites 站主登录作为后端维护入口保留。

首次上线先保持私有，原 Sites 站主身份已绑定，初始化接口已关闭。随后按用户选择开放公开阅读；后台每次请求仍核对站主身份。GitHub 管理权限固定绑定到上述 GitHub 数字 ID，不开放“首次访问者绑定”。

验证边界：本地已构建的前后台已走通 Markdown 与配图导入、预览、保存、发布、关键词搜索和撤回；已检查草稿隔离、版本冲突和手机主题保持。GitHub 会话在本地通过测试数据库注入，OAuth 网络响应的单元检查使用模拟数据，这些不证明真实 GitHub 登录成功。

生产部署已成功，GitHub Pages 首页已在浏览器打开；公开栏目、简介、搜索、跨域预检均通过实际 HTTP 检查，匿名及伪造令牌访问后台被拒绝。生产初始文章和上传配图为空，源码及部署包检查未包含 Client Secret。尚待站主完成真实 GitHub 登录后验证线上编辑与退出重登；尚未使用第二个真实 GitHub 账号验证拒绝访问。
