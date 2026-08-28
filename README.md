# Yi Zhou Personal Site

一个使用 Astro 构建的个人主页与技术博客，面向 AI、计算机视觉、计算机科学和研究实践。

## 本地运行

安装依赖后使用 `npm run dev` 启动开发服务器，使用 `npm run build` 生成静态网站。

## 更新个人信息

姓名、GitHub、邮箱和站点地址统一放在 `src/config.ts`。如果以后更换 GitHub 用户名，还需要同步更新：

- `src/config.ts` 中的 `url` 与 `github`；
- `astro.config.mjs` 中的 `site`；
- GitHub 仓库名，使其保持为 `<新用户名>.github.io`；
- 本地 Git remote 地址。

## 写文章

复制 `src/content/writing/start-here.md`，修改文件名和顶部字段即可。设置 `draft: true` 时，文章不会出现在构建结果中。

## 添加项目

编辑 `src/data/projects.ts`，按照 `Project` 类型添加项目数据。

## 发布

在 GitHub 创建名为 `dmkom522.github.io` 的公开仓库，将本项目推送到 `main` 分支，然后在仓库的 **Settings → Pages** 中将 Source 设为 **GitHub Actions**。此后每次推送都会自动发布。
