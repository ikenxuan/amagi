import { DocsLayout } from 'fumadocs-ui/layouts/notebook'
import type { ReactNode } from 'react'

import { baseOptions } from '@/lib/layout.shared'
import { source } from '@/lib/source'

import { VersionBanner } from './version-banner'

/**
 * Notebook 布局 + `tabMode: 'navbar'` + `nav.mode: 'top'`：
 * 版本与板块入口以 Tabs 形式放进顶部导航栏，侧边栏只显示当前板块的内容
 * （v6 / v7 的侧边栏各自只有使用文档，开发者文档 / AI 代理 / 变更日志
 * 由顶部 Tabs 直达，不再挤进侧边栏）。
 */
export default function Layout({ children }: { children: ReactNode }) {
  const { nav, ...base } = baseOptions()

  return (
    <DocsLayout
      {...base}
      nav={{ ...nav, mode: 'top' }}
      tabMode="navbar"
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
        },
        {
          title: '开发者文档',
          description: '项目架构与新增接口流程',
          url: '/docs/v7/dev'
        },
        {
          title: 'AI 代理',
          description: 'LLMs.txt 与 MCP Server',
          url: '/docs/v7/ai'
        },
        {
          title: '变更日志',
          description: 'v6 各版本的行为变化',
          url: '/docs/v6/changelog'
        }
      ]}
      tree={source.pageTree}
    >
      <VersionBanner />
      {children}
    </DocsLayout>
  )
}
