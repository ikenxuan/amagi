'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * v7 预览版标记：在 /docs/v7/* 页面顶部显示预览版提示，并提供同路径的
 * v6 文档跳转（/docs/v7/x → /docs/v6/x）。v6 / 其它路由不渲染。
 */
export function VersionBanner() {
  const pathname = usePathname()
  if (!pathname.startsWith('/docs/v7')) return null

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-600 dark:text-amber-400">
      当前浏览的是 v7 <strong>预览版</strong>文档（7.0.0 尚未正式发布，API 可能随版本调整）。
      <Link className="ml-1 underline underline-offset-2" href={pathname.replace('/docs/v7', '/docs/v6')}>
        查看对应的 v6 正式版文档
      </Link>
    </div>
  )
}
