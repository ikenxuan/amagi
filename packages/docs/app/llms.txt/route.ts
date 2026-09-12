import { docsLlms, siteUrl, source } from '@/lib/source'

export const revalidate = false

/**
 * `/llms.txt` —— 给 AI 代理的文档索引。
 *
 * 索引部分交给框架的 `llms()`（`lib/source.ts` 的 `docsLlms`）：它按**页面树**
 * 现算，标题、地址、分组都跟侧边栏同源，改导航不必回来改这里。从前那份是手写的
 * 模板串，`/docs/usage/getting-started.mdx` 这类分版前的路径在 v6/v7 双版上线后
 * 就成了死链 —— 手抄的示例路径天然会烂。
 *
 * 页脚那几段是站点自己的东西（MCP 入口、仓库地址、怎么取单页），页面树里没有，
 * 只能手写；示例路径从页面树里现取，至少不会再出现死链。
 */
export async function GET() {
  const pages = source.getPages()
  // 拿两页真存在的地址当「单页怎么取」的例子，比手抄的路径可靠。
  // `page.path` 是带扩展名的虚拟路径（`v7/usage/getting-started.mdx`），
  // 所以按 `.mdx` 找；找不到就退回按 URL 找 —— 路径形态变了也只是少一行示例
  const samples = ['v7/usage/getting-started', 'v7/usage/api/sdk/bilibili']
    .map((path) => pages.find((page) => page.path === `${path}.mdx`) ?? pages.find((page) => page.url === `/docs/${path}`))
    .filter((page) => page !== undefined)

  const content = `${await docsLlms.index()}

## 完整文档

访问 ${siteUrl}/llms-full.txt 获取所有文档的完整内容。

## 单个页面

在任何文档页面 URL 后添加 .mdx 即可获取该页面的 Markdown 内容。

${samples.map((page) => `- ${siteUrl}${page.url}.mdx`).join('\n')}

## 链接

- GitHub: https://github.com/ikenxuan/amagi
- 文档站点: ${siteUrl}
- MCP Server: ${siteUrl}/api/mcp
`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  })
}
