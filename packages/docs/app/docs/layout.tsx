import type { ReactNode } from 'react'

import { baseOptions } from '@/lib/layout.shared'
import { source } from '@/lib/source'

import { DocsShell } from './docs-shell'

/**
 * 服务端壳：页面树在服务端取好传给客户端 DocsShell
 * （fumadocs-mdx 的 server collection 不能进客户端组件）。
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsShell tree={source.getPageTree()} base={baseOptions()}>
      {children}
    </DocsShell>
  )
}
