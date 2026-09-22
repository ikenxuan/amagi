import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/notebook/page'
// 框架自带的「复制 Markdown / 打开于 ChatGPT 等」两个按钮
// （上游 `(framework)/integrations/llms.mdx#page-actions`）。从前这里是
// `components/ai/page-actions.tsx` —— 一份从官方模板抄来又扩过 provider 的
// 214 行实现，而框架早就把同样两个组件发出来了
import { MarkdownCopyButton, ViewOptionsPopover } from 'fumadocs-ui/layouts/notebook/page'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ComponentProps } from 'react'

import { OpenAPIPage } from '@/components/api-page'
import { DocsCategory, type DocsCategoryProps } from '@/components/docs-category'
import { openapi } from '@/lib/openapi'
import { withBase } from '@/lib/site'
import { getPageImage, source } from '@/lib/source'
import { getMDXComponents } from '@/mdx-components'

import { LastUpdated } from './last-updated'

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  // 正文与 TOC 走懒加载（`source.config.ts` 的 `async: true`）：每页各成一个
  // chunk，浏览器只下当前页那份。不 await 的话 121 篇会一并进第一个 chunk。
  // `lastModified` 同批出来（框架 `lastModified()` 插件读的 git 历史）
  const { body: MDX, toc, lastModified } = await page.data.load()
  const gitConfig = {
    user: 'ikenxuan',
    repo: 'amagi',
    branch: 'main'
  }
  // 三批生成物都不进 git：HTTP 端点页（frontmatter 带 `_openapi`）、SDK 方法页
  // （`api/sdk/**`，由 scripts/generate-docs.ts 从端点注册表派生）与「所有版本」
  // 索引页（`v7/changelog/index.mdx`，同一脚本从各版本页的 frontmatter 派生）。
  // 「复制 Markdown」与「在 GitHub 上查看」对它们无意义（后者必然 404）
  const generated = page.data._openapi !== undefined || page.path.startsWith('v7/usage/api/sdk/') || page.path === 'v7/changelog/index.mdx'

  return (
    <DocsPage
      toc={toc}
      full={page.data.full}
      tableOfContent={{
        style: 'clerk'
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      {!generated && (
        <div className="flex flex-row gap-2 items-center border-b pb-6">
          <MarkdownCopyButton markdownUrl={withBase(`${page.url}.mdx`)} />
          <ViewOptionsPopover
            markdownUrl={withBase(`${page.url}.mdx`)}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/packages/docs/content/docs/${page.path}`}
          />
        </div>
      )}
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
            // 「下一步 / 相关阅读」卡片：MDX 里写 `<DocsCategory />` 就够，
            // 起点默认是当前页（组件拿不到自己所在页面的地址，只能在这里注入）
            DocsCategory: (mdxProps: Partial<DocsCategoryProps>) => <DocsCategory {...mdxProps} url={mdxProps.url ?? page.url} />,
            // 生成页的正文就是一个默认导出的 Layout，会从 components 里取
            // OpenAPIPage（document / operations 由它传入）——
            // 不注入的话那 59 页在构建期直接抛错
            OpenAPIPage: async (mdxProps: ComponentProps<typeof OpenAPIPage>) => (
              <OpenAPIPage {...mdxProps} {...await openapi.preloadOpenAPIPage(page)} />
            )
          })}
        />
        {/* 生成页（HTTP 端点 / SDK 方法 / 所有版本索引）是构建期产物，git 历史对读者没有意义 */}
        {!generated && <LastUpdated date={lastModified} />}
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImage(page).url
    }
  }
}
