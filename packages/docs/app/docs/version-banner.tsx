'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const V6_HOME = '/docs/v6/usage'

/**
 * v7 预览版标记：在 /docs/v7/* 页面顶部显示预览版提示，并指向 v6 文档。
 *
 * 同路径跳转（`/docs/v7/x` → `/docs/v6/x`）只在**那一页确实存在于 v6** 时才给 ——
 * v7 独有的页面（生成的 59 个 HTTP 端点页、HTTP 端点参考索引、v7/ai 首页……）
 * 在 v6 里没有对应物，无条件替换前缀会产出一串 404。存在与否由服务端的
 * `layout.tsx` 从 `source.getPages()` 算好传进来。
 * @param props - 组件属性
 * @param props.v6Urls - v6 实际存在的页面地址清单
 * @returns 预览横幅；非 v7 路由返回 `null`
 */
export function VersionBanner({ v6Urls }: { v6Urls: string[] }) {
  const pathname = usePathname()
  if (!pathname.startsWith('/docs/v7')) return null

  const counterpart = pathname.replace('/docs/v7', '/docs/v6')
  const hasCounterpart = v6Urls.includes(counterpart)

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-600 dark:text-amber-400">
      当前浏览的是 v7 <strong>预览版</strong>文档（7.0.0 尚未正式发布，API 可能随版本调整）。
      <Link className="ml-1 underline underline-offset-2" href={hasCounterpart ? counterpart : V6_HOME}>
        {hasCounterpart ? '查看对应的 v6 正式版文档' : '本页是 v7 新增内容，去 v6 正式版文档首页'}
      </Link>
    </div>
  )
}
