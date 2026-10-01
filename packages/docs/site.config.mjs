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

/**
 * 站点前缀，按部署目标切换：读环境变量 `NEXT_PUBLIC_DOCS_BASE_PATH`，
 * 未设时部署在域名根路径。
 *
 *   - GitHub Pages 项目站挂在 `/amagi` 子路径下，由 `pages.yml` 的构建步显式
 *     设 `NEXT_PUBLIC_DOCS_BASE_PATH=/amagi`；
 *   - Netlify / Vercel 部署在各自域名的根路径，什么都不用设。
 *
 * 默认值取 `''` 而不是 `/amagi`：根路径部署的两家平台在仓库里没有可写的配置
 * 入口（Vercel 的环境变量只能在后台配，空值还不好填），反过来把「需要前缀」
 * 做成显式声明、「不需要」落成默认，三个部署目标的口径就都由仓库内的代码
 * 单点决定。
 *
 * **必须是 `NEXT_PUBLIC_` 前缀**：这个常量会进浏览器包（`lib/site.ts` 的
 * `withBase` 给复制按钮、OG 图等手写绝对地址补前缀），不带前缀的环境变量在
 * 客户端包里读出来是 `undefined`，GitHub Pages 上那些地址会集体丢前缀。
 *
 * `post-export.mjs` / `check-links.mjs` 也从这里引 —— 别处不许再抄字面量：
 * 三份拷贝有一份没跟着改，某个平台就是全站资源 404（2026-10 实测）。
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_DOCS_BASE_PATH ?? ''

/**
 * 站点对外地址（含协议与主机）。
 *
 * **恒为 GitHub Pages 那份，不跟着 BASE_PATH 走**：Netlify / Vercel 的对外
 * 域名随时会变（预览地址、自定义域），而 canonical、OG 图、llms.txt 示例
 * 需要的是一个稳定不变的权威地址 —— 从任何镜像进来都归一到这里，也避免
 * 多份部署在搜索引擎里互相竞争。
 */
export const SITE_URL = 'https://ikenxuan.github.io/amagi'
