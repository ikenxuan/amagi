import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { ReactNode } from 'react'

import { baseOptions } from '@/lib/layout.shared'
import { source } from '@/lib/source'

import { VersionBanner } from './version-banner'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      {...baseOptions()}
      tabs={[
        {
          title: 'v7 文档（预览版）',
          description: 'v7 重构版文档，7.0.0 尚未正式发布，API 可能变动',
          url: '/docs/v7'
        },
        {
          title: 'v6 文档（正式版）',
          description: 'amagi v6.x 的正式版文档',
          url: '/docs/v6'
        }
      ]}
      sidebar={{
        defaultOpenLevel: 1
      }}
    >
      <VersionBanner />
      {children}
    </DocsLayout>
  )
}
