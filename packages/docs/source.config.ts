import { resolve } from 'node:path'

import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins'
import { defineConfig, defineDocs, frontmatterSchema, metaSchema } from 'fumadocs-mdx/config'
import { transformerTwoslash } from 'fumadocs-twoslash'
import { createFileSystemGeneratorCache, createGenerator, remarkAutoTypeTable } from 'fumadocs-typescript'

// You can customise Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: frontmatterSchema,
    postprocess: {
      includeProcessedMarkdown: true
    }
  },
  meta: {
    schema: metaSchema
  }
})

/**
 * TS 源码 → 字段表的生成器（`<auto-type-table>` 用它跑 TypeScript 编译器 API）。
 *
 * 缓存不是可选项：`generateTypeTable` 每命中一次就要起一遍 ts-morph 项目、
 * 解析整条 import 链，没缓存的话 serverless 上会超时（上游文档明写）。
 * 缓存键 = 「入口文件路径 + 导出名 + **该文件全文** + 插件版本」，
 * 所以改注释就必然重算；但它**不含被 import 的其他文件**的内容 ——
 * 跨文件改动（改 `contracts/error.ts` 想影响 `result.ts` 的表）可能读到旧值，
 * 那种情况删 `.next/fumadocs-typescript` 即可。
 */
const typeTableGenerator = createGenerator({
  cache: createFileSystemGeneratorCache('.next/fumadocs-typescript')
})

/** MDX 里 `<auto-type-table …>` 那个节点的最小形状（只取本插件要读的字段） */
interface JsxNode {
  type: string
  name?: string | null
  attributes?: { type: string; name?: string; value?: unknown }[]
  children?: unknown[]
}

/** 把 `<auto-type-table>` 引用的 TS 文件登记为该 MDX 模块的构建依赖 */
const registerDeps = (node: JsxNode, file: { cwd: string; dirname?: string; data: Record<string, unknown> }): void => {
  if (node.type === 'mdxJsxFlowElement' && node.name === 'auto-type-table') {
    const attrs = (node.attributes ?? []).filter((attr) => attr.type === 'mdxJsxAttribute')
    const target = attrs.find((attr) => attr.name === 'path')?.value
    if (typeof target === 'string') {
      const base = attrs.some((attr) => attr.name === 'cwd') ? file.cwd : (file.dirname ?? file.cwd)
      const compiler = file.data._compiler as { addDependency?: (path: string) => void } | undefined
      compiler?.addDependency?.(resolve(base, target))
    }
  }
  for (const child of node.children ?? []) registerDeps(child as JsxNode, file)
}

/**
 * 让 `<auto-type-table>` 引用的 TS 源文件成为 MDX 模块的构建依赖。
 *
 * `remarkAutoTypeTable` 用 `fs.readFile` 读源码，却**不登记依赖**
 * （5.3.0 全包 0 次 `addDependency`，而同框架的 `remarkInclude` 是登记的）。
 * 后果实测可见：Turbopack 的持久缓存一命中，整个 remark 阶段都不跑 ——
 * 只改 `packages/core/**` 的注释、不动 MDX，页面上的表不会变，
 * 得先删 `.next` 才刷得出来。登记之后 core 一改，引用它的 MDX 立刻失效重编，
 * `next dev` 与增量构建都跟着走。
 */
const remarkAutoTypeTableDeps = () => (tree: unknown, file: unknown) => {
  registerDeps(tree as JsxNode, file as { cwd: string; dirname?: string; data: Record<string, unknown> })
}

export default defineConfig({
  mdxOptions: {
    // MDX options
    // `<auto-type-table path="…" name="…" />`：字段表从 packages/core 的 TS 源码
    // 现场生成，注释即文案。`path` 相对 **MDX 文件自身**（插件默认 basePath 取
    // vfile.dirname），刻意不设 options.basePath —— 设了就会顶掉这个默认值，
    // 全站的 path 一起改成相对某个固定目录。输出节点名是 `TypeTable`，
    // 所以 mdx-components.tsx 必须注入它。
    // 依赖登记必须排在生成之前：生成之后 `auto-type-table` 节点已被换成 `TypeTable`
    remarkPlugins: [remarkAutoTypeTableDeps, [remarkAutoTypeTable, { generator: typeTableGenerator }]],
    rehypeCodeOptions: {
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      },
      transformers: [...(rehypeCodeDefaultOptions.transformers ?? []), transformerTwoslash()],
      // important: Shiki doesn't support lazy loading languages for codeblocks in Twoslash popups
      // make sure to define them first (e.g. the common ones)
      langs: ['js', 'jsx', 'ts', 'tsx']
    }
  }
})
