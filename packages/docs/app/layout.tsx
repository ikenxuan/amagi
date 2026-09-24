import { RootProvider } from 'fumadocs-ui/provider/next'

import './global.css'
import type { Metadata } from 'next'
import localFont from 'next/font/local'

import { siteUrl } from '@/lib/site'

/**
 * 站点字体 Inter：本地自托管（`next/font/local`），不用 `next/font/google`。
 * 后者在 `next build` 期要去 fonts.googleapis.com 下载 Inter，连不上就是致命
 * build error（本机在代理后连不上；CI 能连）。收进仓库后构建不碰外网、离线可跑、更快。
 *
 * woff2 是 latin 子集的可变字重（一个文件覆盖 `100 900`），取自
 * `@fontsource-variable/inter@5.3.0` 复制进 `app/fonts/`。更新：重装该包 → 重新复制 → 移除。
 * Inter 不含 CJK，中文照旧走系统 fallback（与原 `subsets: ['latin']` 一致）。
 */
const inter = localFont({
  src: [
    { path: './fonts/inter-latin-wght-normal.woff2', style: 'normal', weight: '100 900' },
    { path: './fonts/inter-latin-wght-italic.woff2', style: 'italic', weight: '100 900' }
  ],
  display: 'swap'
})

/**
 * 站点根地址。
 *
 * 不设 `metadataBase` 时 Next 会退回 `http://localhost:3000` 并对每张 og 图打一行
 * 警告 —— 生产环境里 `openGraph.images` 就都指向 localhost，社交预览取不到图。
 * Vercel 的预览部署用它自己给的域名，正式环境用固定域名。
 * 推导规则在 `lib/source.ts` 的 `siteUrl`（llms.txt 也用它拼绝对链接），
 * 这里只是转成 `metadataBase` 要的 URL 对象。
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: '@ikenxuan/amagi 文档',
    template: '%s | @ikenxuan/amagi'
  },
  description: '抖音、B站、快手、小红书 Web 端相关数据接口的 Node.js 封装与服务',
  keywords: ['douyin', 'bilibili', 'kuaishou', 'xiaohongshu', 'api', 'nodejs']
}

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-CN" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        {/* 静态站：搜索索引是构建期导出的一个文件，浏览器下下来自己算。
            框架的默认搜索弹窗认 `type: 'static'`（它内部换成 `staticClient`），
            不必自己写弹窗。`api` 要带站点前缀 —— 它是 fetch 的目标地址。 */}
        <RootProvider search={{ options: { type: 'static', api: `${siteUrl}/api/search` } }}>{children}</RootProvider>
      </body>
    </html>
  )
}
