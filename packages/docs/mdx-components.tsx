import * as Twoslash from 'fumadocs-twoslash/ui'
import { createFileSystemGeneratorCache, createGenerator } from 'fumadocs-typescript'
import { AutoTypeTable, type AutoTypeTableProps } from 'fumadocs-typescript/ui'
import * as AccordionComponents from 'fumadocs-ui/components/accordion'
import * as FilesComponents from 'fumadocs-ui/components/files'
import * as StepsComponents from 'fumadocs-ui/components/steps'
import * as TabsComponents from 'fumadocs-ui/components/tabs'
import { TypeTable } from 'fumadocs-ui/components/type-table'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'

import { Mermaid } from '@/components/mdx/mermaid'

/**
 * `<AutoTypeTable>` 走的生成器。缓存目录与 source.config.ts 里那一份**故意相同** ——
 * 两条路线是两个模块图（一个在 MDX 编译期、一个在 RSC 渲染期），实例共享不了，
 * 但缓存键只由「文件路径 + 导出名 + 文件全文 + 插件版本」算出，目录一致即命中同一批 JSON。
 */
const typeTableGenerator = createGenerator({
  cache: createFileSystemGeneratorCache('.next/fumadocs-typescript')
})

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...Twoslash,
    // 全站组件在这里一次注入，MDX 页面不再逐页抄 `import { Tab, Tabs } from ...`
    // （上游 `ui/components/tabs.mdx` 的 "Add MDX components" 就是这个形态：
    // `import * as TabsComponents` 整段展开）。`Callout` / `Card` / `Cards`
    // 已由 defaultMdxComponents 提供，不必再列
    ...TabsComponents,
    ...StepsComponents,
    ...AccordionComponents,
    // `Files` / `Folder` / `File`：既给手写的 `<Files>`，也给 source.config.ts 的
    // `remarkMdxFiles` —— ` ```files ` 块与 `<auto-files dir pattern>` 都编译成这三个
    ...FilesComponents,
    // ` ```mermaid ` 块（source.config.ts 的 remarkMdxMermaid）编译产物是这个标签
    Mermaid,
    // `<auto-type-table>`（source.config.ts 的 remarkAutoTypeTable）编译产物就是
    // 这个组件，不注入的话用到该标签的页面在构建期直接抛「组件未定义」
    TypeTable,
    // 另一条等价路线：RSC 直接渲染。`path` 相对 **cwd**（组件拿不到 MDX 文件路径），
    // 与 `<auto-type-table>` 的「相对 MDX 文件」不同，别混用同一个相对路径
    AutoTypeTable: (props: Partial<AutoTypeTableProps>) => <AutoTypeTable {...props} generator={typeTableGenerator} />,
    ...components
  }
}
