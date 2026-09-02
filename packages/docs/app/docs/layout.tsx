import type { ReactNode } from 'react'

import { baseOptions } from '@/lib/layout.shared'
import { source } from '@/lib/source'
import { CORE_VERSION, V7_IS_PREVIEW } from '@/lib/version'

import { DocsShell } from './docs-shell'

/**
 * 服务端壳：页面树在服务端取好传给客户端 DocsShell
 * （fumadocs-mdx 的 server collection 不能进客户端组件）。
 *
 * v6 的页面地址清单也在这里算：VersionBanner 要判断当前 v7 页面有没有 v6
 * 对应版本，而它是客户端组件、拿不到 source。
 *
 * 版本口径（`CORE_VERSION` / `V7_IS_PREVIEW`）同样从这里往下传：它读的是
 * `packages/core/package.json`，站上不再手写「预览版 / 正式版」（见 lib/version.ts）。
 */
export default function Layout({ children }: { children: ReactNode }) {
  const v6Urls = source
    .getPages()
    .map((page) => page.url)
    .filter((url) => url.startsWith('/docs/v6/'))

  return (
    <DocsShell base={baseOptions()} coreVersion={CORE_VERSION} isPreview={V7_IS_PREVIEW} tree={source.getPageTree()} v6Urls={v6Urls}>
      {children}
    </DocsShell>
  )
}
