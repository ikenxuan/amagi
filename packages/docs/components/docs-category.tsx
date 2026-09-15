import { findParent, flattenTree, type Folder, type Item, type Node } from 'fumadocs-core/page-tree'
import { Card, Cards } from 'fumadocs-ui/components/card'
import type { ReactNode } from 'react'

import { source } from '@/lib/source'

/**
 * 「下一步 / 相关阅读」卡片列表 —— 链接由**页面树**派生，不手写。
 *
 * 上游形态见 `(framework)/markdown/index.mdx#further-reading-section`：
 * `getPageTreePeers(source.getPageTree(), url)` 的结果映射成 `<Cards>`。
 * 这里用同一模块的 `findParent` 取父节点，是为了多做两件上游那段做不到的事：
 *
 * 1. **保留 folder 节点**（`getPageTreePeers` 定义就是
 *    `findSiblings(...).filter(type === 'page')`，文件夹与它的索引页被过滤掉）——
 *    但「HTTP 端点参考」这类目录本身就是导航目标，落点取索引页或第一个后代页；
 * 2. **按侧边栏分隔符切组**（`group`）。本站 meta.json 用 `...folder` 把目录
 *    平铺进板块根（只有 OpenAPI 那 59 页端点还留着折叠目录），
 *    `---[图标]名字---` 分隔符是页面树里唯一剩下的分组信号，
 *    不切组的话「使用文档」板块任意一页的同级页面就是整个板块的十来页。
 *
 * 新增一页只改 meta.json（或连 meta 都不用改，`...folder` 会带上），
 * 页面里的链接列表不用回头维护；派生出的地址来自页面树，天生不可能是死链。
 */
export interface DocsCategoryProps {
  /**
   * 起点页面地址。MDX 里一般不写 —— `app/docs/[[...slug]]/page.tsx` 注入时
   * 会把当前页地址填进来。
   */
  url: string
  /**
   * 只列某个侧边栏分隔符之后、下一个分隔符之前的那一组页面。
   * 传的是分隔符名字（meta.json 里 `---[Compass]使用指南---` 的「使用指南」）。
   */
  group?: string
}

interface Entry {
  url: string
  name: ReactNode
  description?: ReactNode
  icon?: ReactNode
  external?: boolean
}

/** 文件夹的落点：索引页优先，没有索引页就取深度优先的第一个后代页面 */
const folderEntry = (node: Folder): Entry | undefined => {
  const target = node.index ?? flattenTree(node.children)[0]
  if (!target) return undefined
  return { url: target.url, name: node.name, description: node.description ?? target.description, icon: node.icon ?? target.icon }
}

const pageEntry = (node: Item): Entry => ({
  url: node.url,
  name: node.name,
  description: node.description,
  icon: node.icon,
  external: node.external
})

/**
 * 切出 `---名字---` 之后到下一个分隔符之前的那一段。
 *
 * 找不到分隔符就**抛错让构建红**：这条耦合是故意的 —— 分隔符改名或删掉时，
 * 引用它的页面必须一起改，而不是静默渲染出一个空区块。
 */
const sliceGroup = (children: Node[], group: string): Node[] => {
  const start = children.findIndex((node) => node.type === 'separator' && node.name === group)
  if (start === -1) {
    throw new Error(`<DocsCategory group="${group}"> 在页面树里找不到这个分隔符 —— meta.json 的 \`---${group}---\` 被改名或删了`)
  }
  const rest = children.slice(start + 1)
  const end = rest.findIndex((node) => node.type === 'separator')
  return end === -1 ? rest : rest.slice(0, end)
}

export function DocsCategory({ url, group }: DocsCategoryProps) {
  const parent = findParent(source.getPageTree(), url)
  if (!parent) throw new Error(`<DocsCategory>：页面树里找不到 ${url}`)

  // 不切组时列同级条目（把自己排掉，等价于 getPageTreePeers 再加上 folder）
  const nodes = group ? sliceGroup(parent.children, group) : parent.children.filter((node) => node.type !== 'page' || node.url !== url)
  const entries = nodes.flatMap<Entry>((node) => {
    if (node.type === 'page') return [pageEntry(node)]
    if (node.type === 'folder') return folderEntry(node) ?? []
    // 分隔符没有地址，跳过
    return []
  })

  if (entries.length === 0) {
    throw new Error(`<DocsCategory url="${url}"${group ? ` group="${group}"` : ''}> 派生出 0 张卡片 —— 页面树结构变了，链接列表得跟着改`)
  }

  return (
    <Cards>
      {entries.map((entry) => (
        <Card
          key={entry.url}
          href={entry.url}
          external={entry.external}
          icon={entry.icon}
          title={entry.name}
          description={entry.description}
        />
      ))}
    </Cards>
  )
}
