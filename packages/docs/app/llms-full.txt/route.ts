import { docsLlms } from '@/lib/source'

export const revalidate = false

/**
 * `/llms-full.txt` —— 全部文档拼成一份。
 *
 * 走框架的 `llms().full()`：逐页调 `renderPage`（`lib/source.ts` 里那份），
 * 端点页与普通页的分支都在 `getLLMText` 里，这里只负责拼。从前是
 * `source.getPages().map(getLLMText)` 手拼，等价但把「怎么渲染一页」的知识
 * 散在了两个文件里。
 */
export async function GET() {
  return new Response(await docsLlms.full())
}
