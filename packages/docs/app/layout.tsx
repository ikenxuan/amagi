import { RootProvider } from 'fumadocs-ui/provider/next'

import './global.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import { siteUrl } from '@/lib/source'

const inter = Inter({
  subsets: ['latin']
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
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
