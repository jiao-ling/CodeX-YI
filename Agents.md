# AGENTS.md

> 本文件供人类与编码智能体（IDE 内置 Agent、CLI 等）阅读与执行。  
> **沟通与协作一律使用简体中文**；提交信息与 PR 标题 **必须包含中文**。

---

## 1) 目标
将 `jiao-ling/YI` 引入本仓（路径：`apps/yi/`），在仅使用 **HTML / CSS / JS（三件套）** 的前提下进行工程化与可维护性优化，并通过 GitHub Pages 自动部署静态站点。

当前阶段聚焦核心功能体验，未启用 PWA 相关特性，避免缺失资源导致加载失败。若后续需要跨端安装体验，可在完成功能迭代后补齐 `manifest.json`、站点图标与 Service Worker。

---

## 2) 仓库结构
- `apps/yi/` — YI 的静态站点源码（HTML/CSS/JS）
- `.github/workflows/pages.yml` — GitHub Pages 自动部署
- `.githooks/` — 本地 Git 钩子（提交信息中文校验）
- `.gitmessage` — 中文提交信息模板（可选）
- `AGENTS.md` — 本文件（操作卡）

> 说明：**不引入打包器与前端框架**；仅做三件套层面的规范与部署。

---

## 3) 拉取/更新 YI 源码（使用 `git subtree`）
- **首次引入**
  ```bash
  git remote add yi-origin https://github.com/jiao-ling/YI.git
  git fetch yi-origin
  git subtree add --prefix=apps/yi yi-origin main --squash
  ```

---

## 4) 部署说明
- 默认分支：`main`
- 静态资源目录：`apps/yi/`
- Pages 工作流：`.github/workflows/pages.yml`
- 首次启用 Pages 时需在仓库 Settings → Pages 中设置 Source=GitHub Actions（当前已配置）。

---

## 5) 后续改进建议（未排期）
- 将八卦基础数据外置化，和卦象数据结构统一管理。
- 为数据 JSON 与 JS 回退之间的同步脚本提供自动化方案。
- 若重启 PWA 支持，需补齐 manifest、站点图标及后续 Service Worker。
