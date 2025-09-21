# 易之项目说明

## 模块化加载策略
本次更新引入了前端模块拆分与按需加载机制，通过 `js/module-loader.js` 统一管理。基础模块（主题、通知、卦象数据、模态框、占卜）会在启动阶段串行拉取，其余功能模块在首次交互或空闲时再动态注入，既保持首屏体验，又兼顾后续功能完整性。

## 字体自托管简易方案
为避免依赖外部 CDN，可以按以下步骤完成字体自托管：
1. 使用 [Google Webfonts Helper](https://google-webfonts-helper.herokuapp.com/) 下载所需的 `Noto Serif SC` 字体切片（含 `woff2` 与 `woff`）。
2. 将字体文件放入项目的 `assets/fonts/` 目录，并在 `css/styles.css` 中通过 `@font-face` 声明引入，同时设置 `font-display: swap` 确保文本快速回退。
3. 在 `index.html` 中移除对 Google Fonts 的 `<link>`，改为引用本地样式表；如需进一步优化，可利用 `preload` 标签预加载最常用的字重。
4. 若未来接入构建流程，可结合 `asset hashing` 管控缓存；当前静态部署场景下，保证字体文件与样式同源即可。

以上流程无需额外构建工具即可完成，能够显著提升离线与弱网环境下的渲染稳定性。
