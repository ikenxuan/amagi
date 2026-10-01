import { BASE_PATH, SITE_URL } from '../site.config.mjs'

/**
 * 站点自己拼绝对地址时的唯一入口。
 *
 * 前缀按部署目标来（见 `site.config.mjs`）：GitHub Pages 项目站在 `/amagi`
 * 子路径下，Netlify / Vercel 部署在根路径。
 * Next 的 `basePath` 只会给 `_next/*` 资源与 `next/link` 的 href 自动加前缀 ——
 * **手写进字符串里的绝对地址不会**。而手写的那些恰恰是最要紧的：
 * OG 图的 URL、llms.txt 里的示例、Markdown 复制按钮指向的 `.mdx` 地址、
 * 静态搜索索引的位置。漏掉任何一处，那个功能在线上就 404，本地却完全正常。
 *
 * 所以：凡是要写进响应体、meta 或 fetch 的站内绝对地址，一律过这个函数。
 * @param path - 以 `/` 开头的站内路径，如 `/docs/v7/usage`
 * @returns 带站点前缀的地址：GitHub Pages 上是 `/amagi/docs/v7/usage`，根路径部署原样返回
 */
export function withBase(path: string): string {
  if (!path.startsWith('/')) return path
  return `${BASE_PATH}${path}`
}

/** 站点对外地址（含协议与主机），用于构建产物里的绝对链接 */
export const siteUrl = SITE_URL
