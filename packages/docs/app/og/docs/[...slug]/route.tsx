import { generate as DefaultImage } from 'fumadocs-ui/og'
import { notFound } from 'next/navigation'
import { ImageResponse } from 'next/og'

import { getPageImage, source } from '@/lib/source'

export const revalidate = false

/**
 * 每页的社交预览图。
 *
 * 后端是 `next/og`（satori + resvg）。**不要**换成 `fumadocs-ui/og/takumi`：
 * 2026-09-12 试过，版式对得上，但 takumi 不带中文字形，`AI 代理` 这类标题
 * 整块渲染成豆腐块（对比图见当时的排查记录），而 satori 这边是好的。
 * 换后端之前先确认 takumi 的字体配置能覆盖中文。
 *
 * `site` 是 OG 卡片右下角的落款，与 `app/layout.tsx` 的站点名保持一致。
 */
export async function GET(_req: Request, { params }: RouteContext<'/og/docs/[...slug]'>) {
  const { slug } = await params
  const page = source.getPage(slug.slice(0, -1))
  if (!page) notFound()

  return new ImageResponse(<DefaultImage title={page.data.title} description={page.data.description} site="@ikenxuan/amagi" />, {
    width: 1200,
    height: 630
  })
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImage(page).segments
  }))
}
