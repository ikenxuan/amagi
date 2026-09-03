import type { ReactNode } from 'react'

import { baseOptions } from '@/lib/layout.shared'
import { source } from '@/lib/source'
import { CORE_VERSION, V7_IS_PREVIEW } from '@/lib/version'

import { DocsShell } from './docs-shell'
import { VersionBanner } from './version-banner'

/**
 * 服务端壳：页面树在服务端取好传给客户端 DocsShell
 * （fumadocs-mdx 的 server collection 不能进客户端组件）。
 *
 * v6 的页面地址清单也在这里算：VersionBanner 要判断当前 v7 页面有没有 v6
 * 对应版本，而它是客户端组件、拿不到 source。
 *
 * 版本口径（`CORE_VERSION` / `V7_IS_PREVIEW`）同样从这里往下传：它读的是
 * `packages/core/package.json`，站上不再手写「预览版 / 正式版」（见 lib/version.ts）。
 *
 * 预览横幅是 `DocsShell` 的**兄弟、且排在它前面**，不再是壳里的第一个孩子：
 * 框架的 `Banner` 自己 `sticky top-0`，并往 `:root` 写 `--fd-banner-height`，
 * 而 notebook 布局的容器把这个值读成 `--fd-docs-row-1` —— 顶栏、侧边栏、TOC
 * 的 `top` 与高度都据此下移。放进 `<DocsLayout>` 里它就变成栅格里的一格，
 * 既盖住顶栏，侧边栏也不会让出这 3rem。
 */
export default function Layout({ children }: { children: ReactNode }) {
  const v6Urls = source
    .getPages()
    .map((page) => page.url)
    .filter((url) => url.startsWith('/docs/v6/'))

  return (
    <>
      <VersionBanner coreVersion={CORE_VERSION} isPreview={V7_IS_PREVIEW} v6Urls={v6Urls} />
      <DocsShell base={baseOptions()} isPreview={V7_IS_PREVIEW} tree={source.getPageTree()}>
        {children}
      </DocsShell>
    </>
  )
}
