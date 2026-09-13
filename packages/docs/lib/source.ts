import { llms, type InferPageType, loader } from 'fumadocs-core/source'
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons'
import { docs } from 'fumadocs-mdx:collections/server'

import { siteUrl, withBase } from '@/lib/site'
import { openapiPlugin } from 'fumadocs-openapi/server'

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  // openapiPlugin 给生成的端点页在侧边栏加 HTTP 方法徽标（全部是 GET）
  plugins: [lucideIconsPlugin(), openapiPlugin()]
})

// 站点对外地址与「拼绝对地址」的唯一入口都在 `lib/site.ts`：静态站挂在
// GitHub Pages 的子路径下，手写的绝对地址必须带前缀，否则线上 404 而本地正常。
export { siteUrl }

/**
 * `llms.txt` / `llms-full.txt` 的生成器（上游 `(framework)/integrations/llms.mdx`）。
 *
 * 从前这两个路由是手写的：`llms.txt` 那份把站点地址、示例路径、MCP 地址逐字
 * 抄在模板串里，于是 `/docs/usage/getting-started.mdx` 这类**分版前的路径**
 * 在 v6/v7 双版上线后就成了死链，而且没人会想起来改。交给 `llms()` 之后，
 * 索引由**页面树**现算 —— 标题、地址、分组都来自 `source` 与各层 `meta.json`
 * （根标题就是 `content/docs/meta.json` 的 `"Amagi 文档"`），改导航不必改这里。
 *
 * `renderPage` 是 `page()` / `full()` 的必需项，只吃一个 `page` 参数。
 * `getLLMText` 已经把标题写在正文开头，这里只是把标题换成带绝对地址的那一行 ——
 * 正文里真正有用的内容（代码块、表格）不受影响。
 * 首行摘要**同时输出 Markdown 标题与 `> 摘要`**：前者是给读全文的模型的分节标记，
 * 后者是 llms.txt 约定里被引用时用的那句。
 */
export const docsLlms = llms(source, {
  renderPage: async (page) => {
    const text = await getLLMText(page)
    const body = text.replace(/^# .*\n(?:\n)?/, '')
    const description = page.data.description ? `\n\n> ${page.data.description}` : ''
    return `# ${page.data.title} (${siteUrl}${page.url})${description}\n\n${body}`
  }
})

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, 'image.png']

  return {
    segments,
    // 带站点前缀：这个 URL 会进 `generateMetadata` 的 `openGraph.images`，
    // 是写进 HTML 的绝对地址，Next 的 basePath 管不到字符串拼接
    url: withBase(`/og/docs/${segments.join('/')}`)
  }
}

/**
 * 一页的 LLM 文本（`/llms-full.txt` 与 MCP 的 `get_page` 都用它）。
 *
 * 两段式：`# 标题` + 正文。**标题只在这里写一次** —— 从前它拼在 llms-full.txt
 * 的路由里，而 MCP 的 `get_page` 直接把返回值当正文，于是标题在
 * llms-full.txt 里对、在 MCP 里丢（后来又补了一次，反而重复）。
 *
 * 生成的端点页正文不是 Markdown，而是一段 `export default function Layout(props)`
 * （端点卡片由客户端渲染）。直接吐 processed 文本会把 59 段 JSX 灌进
 * llms-full.txt，对读它的模型毫无用处 —— 这里换成一行人话 + 方法 + 页面地址。
 *
 * 其余页面取 `getText('processed')`（由 `source.config.ts` 的
 * `includeProcessedMarkdown` 产出）。它不是写作者手写的原文，而是**渲染后的
 * Markdown**：标题带 `[#锚点]` 后缀（`remarkHeading` 的产物，上游自己的
 * llms.txt 也是这个形态）、内容里没有 JSX。要拿真正未经处理的原文只有
 * `getText('raw')`，那条路要读磁盘、还把 frontmatter 一起带出来。
 */
export async function getLLMText(page: InferPageType<typeof source>) {
  const openapiMeta = page.data._openapi as { method?: string } | undefined
  if (openapiMeta) {
    const method = (openapiMeta.method ?? 'get').toUpperCase()
    const description = page.data.description ? `\n\n${page.data.description}` : ''
    return `# ${page.data.title}

${method} HTTP 端点。参数、响应与在线调用见 ${page.url}（规范源：packages/core/openapi.json）${description}`
  }

  return await page.data.getText('processed')
}
