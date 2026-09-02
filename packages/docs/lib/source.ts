import { type InferPageType, loader } from 'fumadocs-core/source'
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons'
import { docs } from 'fumadocs-mdx:collections/server'
import { openapiPlugin } from 'fumadocs-openapi/server'

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  // openapiPlugin 给生成的端点页在侧边栏加 HTTP 方法徽标（全部是 GET）
  plugins: [lucideIconsPlugin(), openapiPlugin()]
})

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, 'image.png']

  return {
    segments,
    url: `/og/docs/${segments.join('/')}`
  }
}

export async function getLLMText(page: InferPageType<typeof source>) {
  // 生成的端点页正文不是 Markdown，而是一段 `export default function Layout(props)`
  // （端点卡片由客户端渲染）。直接吐 processed 文本会把 59 段 JSX 灌进
  // llms-full.txt，对读它的模型毫无用处 —— 这里换成一行人话 + 方法 + 页面地址。
  const openapiMeta = page.data._openapi as { method?: string } | undefined
  if (openapiMeta) {
    const method = (openapiMeta.method ?? 'get').toUpperCase()
    const description = page.data.description ? `\n\n${page.data.description}` : ''
    return `# ${page.data.title}

${method} HTTP 端点。参数、响应与在线调用见 ${page.url}（规范源：packages/core/openapi.json）${description}`
  }

  const processed = await page.data.getText('processed')

  return `# ${page.data.title}

${processed}`
}
