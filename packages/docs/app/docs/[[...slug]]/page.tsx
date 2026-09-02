import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/notebook/page'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ComponentProps } from 'react'

import { LLMCopyButton, ViewOptions } from '@/components/ai/page-actions'
import { OpenAPIPage } from '@/components/api-page'
import { DocsCategory, type DocsCategoryProps } from '@/components/docs-category'
import { openapi } from '@/lib/openapi'
import { getPageImage, source } from '@/lib/source'
import { getMDXComponents } from '@/mdx-components'

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  const MDX = page.data.body
  const gitConfig = {
    user: 'ikenxuan',
    repo: 'amagi',
    branch: 'main'
  }
  // 两批生成物都不进 git：HTTP 端点页（frontmatter 带 `_openapi`）与 SDK 方法页
  // （`api/sdk/**`，由 scripts/generate-docs.ts 从端点注册表派生）。
  // 「复制 Markdown」与「在 GitHub 上查看」对它们无意义（后者必然 404）
  const generated = page.data._openapi !== undefined || page.path.startsWith('v7/usage/api/sdk/')

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={{
        style: 'clerk'
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      {!generated && (
        <div className="flex flex-row gap-2 items-center border-b pb-6">
          <LLMCopyButton markdownUrl={`${page.url}.mdx`} />
          <ViewOptions
            markdownUrl={`${page.url}.mdx`}
            // update it to match your repo
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
