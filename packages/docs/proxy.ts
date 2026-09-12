import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 把 `/docs/<路径>` 重写到 `/docs/<路径>.mdx`（即 `app/llms.mdx/docs/[[...slug]]`
 * 那份纯 Markdown）。
 *
 * 触发条件是 **`Accept` 头偏好 Markdown**（`isMarkdownPreferred`，看 `text/plain`
 * 与 `text/markdown` 的 q 值是否压过 `text/html`）。浏览器默认把 `text/html` 排在
 * 前面，命中不了；`curl -H 'Accept: text/plain'` 这类显式声明的客户端才会被改写。
 *
 * 与 `next.config.mjs` 里那条 `rewrites()` 的分工：那条只认显式带 `.mdx` 后缀的
 * 地址（`/docs/foo.mdx`），这条管**不带后缀**的同一个地址按 `Accept` 分流。
 * 两条都指向同一个 route handler。
 *
 * 通配符写法注意：这里的 `*path` 是 **path-to-regexp v8** 语法（`rewritePath` 与
 * Next 的 `rewrites()` 都用它），不是 Next 路由里那种 `:path*` —— 后者在 v8 里
 * 会直接抛 `Missing parameter name`（实测，整个 middleware 一起挂）。
 *
 * （上游写法见 `(framework)/integrations/llms.mdx#accept`。Next 16 起这个文件名
 * 叫 `proxy.ts`，`middleware.ts` 是旧名。）
 */
const docsMarkdown = rewritePath('/docs/*path', '/docs/*path.mdx')

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const markdownUrl = docsMarkdown.rewrite(pathname)

  if (markdownUrl && isMarkdownPreferred(request)) {
    const url = request.nextUrl.clone()
    url.pathname = markdownUrl
    // `Vary: Accept`：同一个地址按 `Accept` 出两种表示（HTML / Markdown），
    // 不声明的话 CDN 会把其中一份缓存给所有客户端。上游文档提醒 Next 在
    // App Router 的**页面**响应上会丢掉这个头，那种情况要落到 CDN 层去设；
    // route handler 这边带得住，先在这里给上。
    return NextResponse.rewrite(url, { headers: { Vary: 'Accept' } })
  }
}

export const config = {
  // 只在这几条路径上跑，别让全站请求都过一次 middleware
  matcher: ['/docs/:path*']
}
