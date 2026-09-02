'use client'

import { DocsLayout } from 'fumadocs-ui/layouts/notebook'
import type { Root as PageTreeRoot } from 'fumadocs-core/page-tree'
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { VersionBanner } from './version-banner'

/**
 * 版本下拉：紧贴站点标题（HeroUI 的「logo + v3.2.4 ∨」样式），
 * 当前版本按路径推断，菜单在两个版本的使用文档之间切换。
 */
function VersionMenu() {
  const pathname = usePathname()
  const isV6 = pathname.startsWith('/docs/v6')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const versions = [
    { label: 'v7 文档（预览版）', href: '/docs/v7/usage' },
    { label: 'v6 文档（正式版）', href: '/docs/v6/usage' }
  ]

  return (
    <div className="relative inline-flex items-center" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
      >
        {isV6 ? 'v6 文档（正式版）' : 'v7 文档（预览版）'}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full z-50 mt-1 min-w-44 rounded-lg border border-fd-border bg-fd-popover p-1 shadow-lg">
          {versions.map((version) => (
            <Link
              key={version.href}
              href={version.href}
              onClick={() => setOpen(false)}
              className={`block rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-fd-accent ${
                pathname.startsWith(version.href.replace('/usage', '')) ? 'text-fd-primary' : 'text-fd-foreground'
              }`}
            >
              {version.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/** v7 的板块 Tabs（与 v6 各自独立，避免标题重复的六个 Tab） */
const V7_TABS = [
  {
    title: '使用文档',
    description: '安装、SDK 与 HTTP 服务',
    url: '/docs/v7/usage'
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
  }
]

/** v6 的板块 Tabs（v6 没有独立的 AI 板块，多一个变更日志） */
const V6_TABS = [
  {
    title: '使用文档',
    description: '安装、SDK 与 HTTP 服务',
    url: '/docs/v6/usage'
  },
  {
    title: '开发者文档',
    description: 'v6 口径的项目架构与接口流程',
    url: '/docs/v6/dev'
  },
  {
    title: '变更日志',
    description: 'v6 各版本的行为变化',
    url: '/docs/v6/changelog'
  }
]

/**
 * Notebook 布局外壳：
 * - `tabMode: 'navbar'` + `nav.mode: 'top'` —— 顶部导航栏承载 Tabs 与版本下拉；
 * - Tabs 按 当前路径的版本 计算（v7 / v6 各自一套，见上方常量）；
 * - 侧边栏内容由页面树里各板块自己的 `root: true` 决定（usage / dev / ai /
 *   changelog 六个根），每个 Tab 只看到自己板块的条目；
 * - 侧边栏已在 meta 里用 `...folder` 提取 + `---分隔符---` 平铺，无折叠目录。
 */
export function DocsShell({
  tree,
  base,
  v6Urls,
  children
}: {
  tree: PageTreeRoot
  base: BaseLayoutProps
  /** v6 实际存在的页面地址，供 VersionBanner 判断当前页有没有 v6 对应版本 */
  v6Urls: string[]
  children: ReactNode
}) {
  const pathname = usePathname()
  const { nav, ...rest } = base
  // baseOptions 的 title 是字符串；类型层是 ReactNode | FC，这里收窄成 ReactNode
  const navTitle = nav?.title as ReactNode | undefined

  return (
    <DocsLayout
      {...rest}
      nav={{
        ...nav,
        mode: 'top',
        title: (
          <span className="inline-flex items-center gap-1">
            {navTitle}
            <VersionMenu />
          </span>
        )
      }}
      tabMode="navbar"
      tabs={pathname.startsWith('/docs/v6') ? V6_TABS : V7_TABS}
      tree={tree}
    >
      <VersionBanner v6Urls={v6Urls} />
      {children}
    </DocsLayout>
  )
}
