# 易之（YI）

易之是一个基于《易经》的静态站点，占卜、卦象分析与知识库完全由 HTML/CSS/JS 组合实现，不依赖打包器或第三方框架。

## 目录结构
- `index.html`：主页面，包含站点骨架与语义化结构。
- `css/styles.css`：全局样式与主题配色。
- `js/app.js`：核心应用内核，负责模块注册、生命周期与错误处理。
- `js/services/hexagram-data-service-module.js`：卦象数据服务，负责从 `data/hexagrams.json` 异步加载与处理数据。
- `js/modules/`：功能模块集合（主题、通知、占卜、历史、查询等），已拆分成多个易维护的文件。
- `data/hexagrams.json`：六十四卦的结构化数据源（用于 GitHub Pages 等标准静态托管环境）。
- `data/bagua.json`：八卦基础数据源，与卦象数据分离管理。
- `data/bagua.js`：八卦预加载数据，保障离线或 `file://` 访问可用。
- `data/hexagrams.js`：预加载版本的数据文件，确保在 `file://` 直接打开页面或离线情况下仍可使用。

## 开发指南
1. 使用任意静态文件服务器（如 `python -m http.server`）在 `apps/yi/` 目录下启动本地调试。
2. 所有脚本均采用 `<script defer>` 方式加载，确保按顺序初始化。
3. 如需扩展功能，请在 `js/modules/` 目录内新增对应模块文件，并在 `index.html` 中补充 `<script>` 引用，遵循现有命名规范。
4. 卦象或八卦数据更新可直接编辑 `data/hexagrams.json` 与 `data/bagua.json`，如有需要请同步生成对应的 `data/*.js` 回退文件。

## 浏览器支持
站点依赖浏览器原生 `fetch` 与 ES2020 语法，建议使用现代 Chromium、Firefox 或 Safari 浏览器访问。

## 部署
仓库通过 GitHub Pages 自动部署静态资源，配置位于 `.github/workflows/pages.yml`（如需调整请同步更新）。

## 范围说明
当前工程专注于功能体验，未启用任何 PWA 相关资源或 Service Worker，避免额外依赖导致的加载失败。如需拓展跨端安装能力，可在后续迭代补充 `manifest.json`、图标和离线缓存策略。
