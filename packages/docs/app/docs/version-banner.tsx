'use client'

import { Banner } from 'fumadocs-ui/components/banner'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const V6_HOME = '/docs/v6/usage'

/**
 * v7 预览版标记：在 /docs/v7/* 页面顶部显示预览版提示，并指向 v6 文档。
 *
 * 外壳换成了框架自带的 `Banner`（fumadocs-ui/components/banner），不再手搓 div：
 * 给了 `id` 就自带一个把状态写进 localStorage 的关闭按钮，关掉之后它把
 * `--fd-banner-height` 的作用域收成 `:root:not(.nd-banner-<hash>)`，布局自己回弹。
 * 而 notebook 布局的容器正是把这个变量读成 `--fd-docs-row-1` —— 顶栏、侧边栏、
 * TOC 的 `top` 与高度都从它算起，所以横幅必须挂在 `DocsShell` **外面**（见
 * `layout.tsx`）：塞进 `<DocsLayout>` 里它只是栅格里的一格，会压在顶栏上，
 * 侧边栏也不肯让出那 3rem。
 *
 * `Banner` 高度固定（3rem，内容单行居中），所以括号里的细节用 `max-md:hidden`
 * 在窄屏收掉，手机上只留「这是 v7 预览版文档」和那条链接。
 *
 * 同路径跳转（`/docs/v7/x` → `/docs/v6/x`）只在**那一页确实存在于 v6** 时才给 ——
 * v7 独有的页面（生成的 59 个 HTTP 端点页、HTTP 端点参考索引、v7/ai 首页……）
 * 在 v6 里没有对应物，无条件替换前缀会产出一串 404。存在与否由服务端的
 * `layout.tsx` 从 `source.getPages()` 算好传进来。
 *
 * 版本号与「是否预览」也由服务端传入（`lib/version.ts` 读
 * `packages/core/package.json`）：从前这里硬编码「7.0.0 尚未正式发布」，
 * 而版本号由 release-please 发版时才写入 —— 那道缝就是 BUG-5。
 * `7.0.0` 落地的那一刻这条横幅自动消失，不需要有人回头改文案。
 * @param props - 组件属性
 * @param props.v6Urls - v6 实际存在的页面地址清单
 * @param props.coreVersion - `packages/core` 的当前版本号
 * @param props.isPreview - v7 是否仍是预览态
 * @returns 预览横幅；非 v7 路由、或 v7 已正式发布时返回 `null`
 */
export function VersionBanner({ v6Urls, isPreview }: { v6Urls: string[]; coreVersion: string; isPreview: boolean }) {
  const pathname = usePathname()
  if (!pathname.startsWith('/docs/v7') || !isPreview) return null

  // v7 把 SDK 方法四页下沉到 `usage/api/sdk/`（生成物与手写页分家），
  // 而 v6 里它们仍在 `usage/api/` 下 —— 不映一下，这四页会退化成「本页是 v7 新增内容」
  const counterpart = pathname.replace('/docs/v7', '/docs/v6').replace('/usage/api/sdk/', '/usage/api/')
  const hasCounterpart = v6Urls.includes(counterpart)

  return (
    // 琥珀色沿用旧横幅（`className` 在框架的 cn() 里排最后，压得住默认的 bg-fd-secondary）；
    // pe-12 是给贴在 `inset-e-2` 的关闭按钮留位，否则居中的文案会钻到它底下
    <Banner
      variant="rainbow"
      rainbowColors={[
        'rgba(255,100,0, 0.5)',
        'rgba(255,100,0, 0.5)',
        'transparent',
        'rgba(255,100,0, 0.5)',
        'transparent',
        'rgba(255,100,0, 0.5)',
        'transparent'
      ]}
      id="amagi-v7-preview"
    >
      <span>
        当前浏览的是 v7 <strong>预览版</strong>文档
      </span>
      <span className="max-md:hidden">（v7 尚未正式发布，API 可能随版本调整）</span>
      {/* 句号单独一格：它在上面那个 max-md:hidden 里的话，窄屏收掉括号后句子就没有收尾了 */}
      <span>。</span>
      <Link className="ms-1 underline underline-offset-2" href={hasCounterpart ? counterpart : V6_HOME}>
        {hasCounterpart ? (
          '查看对应的 v6 正式版文档'
        ) : (
          <>
            <span className="max-md:hidden">本页是 v7 新增内容，</span>去 v6 正式版文档首页
          </>
        )}
      </Link>
    </Banner>
  )
}
