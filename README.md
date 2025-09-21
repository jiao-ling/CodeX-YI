# YI

现代化的卜卦系统，提供易经演算、历史记录与知识库等完整体验。

## 本地开发

1. 克隆项目并进入仓库目录。
2. 直接使用浏览器打开 `index.html` 即可预览全部功能。

## GitHub Pages 部署

仓库已内置 GitHub Actions 工作流，会在推送到 `main`、`master` 或 `work` 分支时自动部署静态站点到 `gh-pages` 分支。

首次启用时请按以下步骤操作：

1. 在 GitHub 仓库的 **Settings → Pages** 中，将 Source 设置为 **GitHub Actions**。
2. 合并或推送最新代码到受监听的分支，工作流会自动运行。
3. 工作流成功后，在同一页面即可看到站点访问地址，用于线上预览和展示。

如需手动触发部署，可在 GitHub Actions 页面执行 `Deploy static site to GitHub Pages` 工作流。
