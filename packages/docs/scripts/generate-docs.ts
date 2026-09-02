import { rm } from 'node:fs/promises'

import { generateFiles } from 'fumadocs-openapi'

import { openapi } from '../lib/openapi'

/**
 * 从 `packages/core/openapi.json` 生成 59 个端点参考页。
 *
 * 产物**不进 git**（`.gitignore` 忽略整个 `api/http/`），由 `docs:api` 在
 * `next build` / `next dev` / `typecheck` 之前跑。手写一份路由表正是阶段 8 要根治的事。
 *
 * 三个不得不自己处理的点：
 * - **先删再生成**：上游只做 mkdir + writeFile，从不清理。端点改名或下线后，
 *   旧页会永久留在 content 里被 `getPages()` 继续吐出来（幽灵端点）。
 * - **落到 `api/http/` 而不是 `api/`**：fumadocs 解析 meta 的 `pages` 条目时
 *   文件夹优先于同名文件，生成 `api/bilibili/` 会让手写的 `api/bilibili.mdx`
 *   静默变成孤儿页（URL 还在、侧边栏没了）；而 `meta: true` 写的根 meta.json
 *   会原地覆盖已提交的 `api/meta.json`。
 * - **`name()` 削掉 operationId 的平台前缀**：规范里 operationId 必须全局唯一
 *   （`emojiList` 四个平台各有一条），所以是 `bilibili_videoInfo`；而文件已经
 *   在 `bilibili/` 目录下，页面名只要 `videoInfo`。
 */
const OUT = './content/docs/v7/usage/api/http'

await rm(OUT, { recursive: true, force: true })

await generateFiles({
  input: openapi,
  output: OUT,
  per: 'operation',
  groupBy: 'tag',
  // 只在 OUT 内部写 meta.json，不碰手写的 api/meta.json
  meta: true,
  // 取默认 false：开了 description 就只进正文、不进 frontmatter，
  // 而本仓的 DocsDescription / og 图 / MCP 列表都读 page.data.description
  includeDescription: false,
  addGeneratedComment: true,
  name (output) {
    if (output.type !== 'operation') return 'index'
    const operation = this.document.paths?.[output.item.path]?.[output.item.method]
    const operationId = (operation as { operationId?: string } | undefined)?.operationId
    return operationId ? operationId.replace(/^[^_]+_/, '') : 'index'
  },
  beforeWrite (files) {
    // 根 meta.json 由生成器写出且没有 title（parent 为 undefined），
    // 侧边栏会显示目录名 "Http"。在写盘前补上中文标题与图标
    const root = files.find((file) => file.path === 'meta.json')
    if (root) {
      root.content = `${JSON.stringify({ title: 'HTTP 端点参考', icon: 'Server', ...(JSON.parse(root.content) as object) }, null, 2)}\n`
    }
  }
})
