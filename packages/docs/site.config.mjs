/**
 * 站点部署位置的单一事实源。
 *
 * 为什么要单独一个文件：`next.config.mjs` 与应用代码（`lib/site.ts`）都需要这个
 * 常量，而**应用代码不能去 import `next.config.mjs`** —— 那会把配置里的
 * `code-inspector-plugin` 连带拖进客户端包，它带着 esbuild 的**二进制**，
 * Turbopack 当场报 `Unknown module type`（实测）。
 *
 * 所以常量放这里，两边各引一次。这文件必须保持**零依赖的纯 ESM** ——
 * 它会被打进浏览器包。
 */

/** 文档站在 GitHub Pages 上的子路径。仓库没有 CNAME，项目站的地址就是这个形状 */
export const BASE_PATH = '/amagi'

/** 站点对外地址（含协议与主机） */
export const SITE_URL = `https://ikenxuan.github.io${BASE_PATH}`
