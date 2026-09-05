// 侧边栏检查：每个条目都要有一个真实存在的图标，且除 OpenAPI 端点那棵子树以外
// 不许出现折叠目录、分区分隔符只许有一层。
//
// 为什么要有这个脚本 —— 这三种退化全都不报错：
//   1. 图标名拼错：`lucideIconsPlugin` 对不认识的名字只 `console.warn` 一行就放行
//      （见 fumadocs-core/dist/source/plugins/lucide-icons.js），代价是那一格图标位
//      悄悄空着，构建绿、CI 绿；
//   2. frontmatter 漏写 `icon:` 更安静，页面照出，只是没图标；
//   3. 「侧边栏完全平铺」是 meta.json 里 `...folder` 提取撑起来的约定，不是框架行为 ——
//      新加一层目录而忘了提取，侧边栏自己长出一个折叠目录，同样零报错。
//
// 判定方式：不跑 Next。把 `content/docs` 下的 frontmatter 与 meta.json 喂给 fumadocs
// 自己的 `loader()` —— 同一个页面树构建器，区别只是这里**不装图标插件**，于是
// `node.icon` 停在字符串阶段（见 fumadocs-core/dist/icon-*.js 的 iconPlugin），
// 正好拿来跟 `lucide-react` 的导出名逐个对。
//
// 「一个侧边栏」= 一个 `root: true` 目录的 children（Notebook 布局按当前页最近的 root
// 祖先取侧边栏，见 docs-shell.tsx）。所以 v7/v6 那两层目录节点、七个板块根自己
// 都不算折叠目录，检查从板块根的 children 往下走。
//
// 跟在 `docs:api` 之后跑（生成物要先在），图标缺失或结构走形即非 0 退出。
//
// 自身失效模式的防护（脚本自己烂掉时必须响，不能静默放行）：
//   1. 板块根少于 7 个、或页面少于 40 个 → exit 1（`content/docs` 没扫到，
//      「没有问题」是平凡真）；
//   2. OpenAPI 子树里的平台目录少于 4 个 → exit 1（生成物没跑，
//      那条「折叠目录只许出现在这里」的豁免会变成空豁免）；
//   3. frontmatter 出现本脚本解析不了的写法 → exit 1（宁可先修脚本）。

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { loader } from 'fumadocs-core/source'
import { icons } from 'lucide-react'

/** 文档根，与 source.config.ts 的 `defineDocs({ dir })` 同一个目录 */
const CONTENT = join('content', 'docs')
/**
 * 整站唯一允许保留折叠目录的子树：fumadocs-openapi 生成的 59 个端点页。
 * 铺开就是 59 行平铺条目，折叠目录在这里是唯一读得下去的形态。
 */
const OPENAPI_DIR = 'v7/usage/api/http'

const errors = []
const fail = (message) => errors.push(message)

// ─────────────────────────── 扫盘：frontmatter + meta.json ───────────────────────────

/**
 * 取 frontmatter 里的 title / description / icon。
 *
 * 只认顶层「一行一个 `key: 值`」—— 全站手写页现在都是这个形状。缩进行与
 * `- ` 列表项整段跳过：生成的端点页带一块嵌套的 `_openapi:`（method / preload），
 * 而本脚本一个字都不读它。除此之外的写法直接抛：解析器悄悄读错比读不出来危险得多。
 * @param {string} text - 文件全文
 * @param {string} path - 相对 content/docs 的路径（报错用）
 * @returns {{ title?: string, description?: string, icon?: string }} 取到的三个字段
 */
const frontmatter = (text, path) => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!match) {
    fail(`${path}：没有 frontmatter`)
    return {}
  }
  const data = {}
  for (const line of match[1].split(/\r?\n/)) {
    // 空行、嵌套块的缩进行、列表项 —— 顶层字段不长这样
    if (line.trim() === '' || /^[\s-]/.test(line)) continue
    const entry = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line)
    if (!entry) {
      console.error(`❌ ${path} 的 frontmatter 有本脚本读不懂的一行：${JSON.stringify(line)}`)
      console.error('   （只支持顶层「一行一个 key: 值」；先教会 scripts/check-sidebar.mjs 再谈检查结论）')
      process.exit(1)
    }
    if (entry[2] !== '') data[entry[1]] = entry[2].replace(/^['"]|['"]$/g, '')
  }
  return data
}

const files = []
const walk = (dir) => {
  for (const entry of readdirSync(join(CONTENT, dir), { withFileTypes: true })) {
    const path = dir === '' ? entry.name : `${dir}/${entry.name}`
    if (entry.isDirectory()) {
      walk(path)
      continue
    }
    const text = readFileSync(join(CONTENT, path), 'utf8')
    if (entry.name === 'meta.json') {
      files.push({ type: 'meta', path, data: JSON.parse(text) })
    } else if (/\.mdx?$/.test(entry.name)) {
      files.push({ type: 'page', path, data: frontmatter(text, path) })
    }
  }
}
walk('')

const pageCount = files.filter((file) => file.type === 'page').length
if (pageCount < 40) {
  console.error(`❌ 只扫到 ${pageCount} 个页面文件（期望 100+）—— ${CONTENT} 没读全，先跑 pnpm docs:api`)
  process.exit(1)
}

// 不装 lucideIconsPlugin：这里要的就是 icon 的**字符串名**
const source = loader({ baseUrl: '/docs', source: { files } })

// ─────────────────────────── 走树：板块根 → 侧边栏 ───────────────────────────

/** 节点背后的文件路径（page 是自身，folder 是目录），相对 content/docs */
const refOf = (node) => (node.type === 'folder' ? node.$ref?.folder : node.$ref)
const inOpenApi = (node) => {
  const ref = refOf(node)
  return typeof ref === 'string' && (ref === OPENAPI_DIR || ref.startsWith(`${OPENAPI_DIR}/`))
}

/**
 * 校验一个条目的图标。
 *
 * 端点页豁免：它们靠 `openapiPlugin` 在标题后挂 HTTP 方法徽标区分彼此，
 * 59 个一样的图标只是噪声。但它们的**平台目录**不豁免 —— 折叠起来时那一行就是全部信息。
 * @param {object} node - 页面树节点
 * @param {string} where - 所在板块（报错用）
 */
const checkIcon = (node, where) => {
  const label = `${where} → ${node.type === 'separator' ? `---${node.name}---` : (refOf(node) ?? node.name)}`
  if (node.type !== 'folder' && inOpenApi(node)) return
  if (node.icon === undefined) {
    fail(`${label}：没有图标`)
    return
  }
  if (!(node.icon in icons)) fail(`${label}：图标 \`${node.icon}\` 不是 lucide-react 的导出名`)
}

const sections = []
const collectSections = (node) => {
  if (node.type !== 'folder' && node.type !== 'root') return
  if (node.type === 'folder' && node.root === true) {
    sections.push(node)
    return
  }
  for (const child of node.children) collectSections(child)
}
collectSections(source.getPageTree())

if (sections.length < 7) {
  console.error(`❌ 只找到 ${sections.length} 个 \`root: true\` 板块（期望 7：v7 的 usage/dev/ai + v6 的 usage/dev/ai/changelog）`)
  process.exit(1)
}

let openApiFolders = 0
const lines = []

for (const section of sections) {
  const where = `${refOf(section)}（${section.name}）`
  if (section.icon === undefined || !(section.icon in icons)) {
    fail(`${where}：板块根的 meta.json 图标缺失或无效（${section.icon ?? '无'}）`)
  }
  lines.push(`\n■ ${section.name}  [${section.icon ?? '—'}]  ${refOf(section)}`)

  /**
   * 递归查一层。`depth` 只用来判分隔符：分区只许出现在板块根的直接 children 里，
   * 嵌一层就意味着某个 `...folder` 把下一级的分隔符整段搬了上来，
   * 于是侧边栏会出现「分区里还有分区」——「一层分区」这条约定就是这么破的。
   * @param {object[]} children - 该层的子节点
   * @param {number} depth - 相对板块根的深度
   */
  const walkLevel = (children, depth) => {
    for (const node of children) {
      checkIcon(node, where)
      if (node.type === 'separator') {
        if (depth > 0) fail(`${where} → ---${node.name}---：分隔符嵌在第 ${depth + 1} 层，分区只许有一层`)
        lines.push(`${'  '.repeat(depth + 1)}── ${node.name} ──  [${node.icon ?? '—'}]`)
        continue
      }
      if (node.type === 'page') {
        if (!inOpenApi(node)) lines.push(`${'  '.repeat(depth + 1)}${node.icon ?? '（无图标）'}  ${node.name}`)
        continue
      }
      // folder
      if (!inOpenApi(node)) {
        fail(`${where} → ${refOf(node)}（${node.name}）：折叠目录只许出现在 ${OPENAPI_DIR}/ 下，其余一律用 \`...folder\` 平铺`)
      } else if (refOf(node) !== OPENAPI_DIR) {
        openApiFolders += 1
      }
      const pages = node.children.filter((child) => child.type === 'page').length
      const folders = node.children.filter((child) => child.type === 'folder').length
      lines.push(`${'  '.repeat(depth + 1)}${node.icon ?? '（无图标）'}  📁 ${node.name}（${folders} 目录 / ${pages} 页）`)
      walkLevel(node.children, depth + 1)
    }
  }
  walkLevel(section.children, 0)
}

if (openApiFolders < 4) {
  console.error(`❌ ${OPENAPI_DIR}/ 下只找到 ${openApiFolders} 个平台目录（期望 4）—— 生成物没跑，先 pnpm docs:api`)
  process.exit(1)
}

console.log(lines.join('\n'))

if (errors.length > 0) {
  console.error(`\n❌ 侧边栏有 ${errors.length} 处问题：`)
  for (const message of errors) console.error(`   · ${message}`)
  process.exit(1)
}

console.log(`\n✅ 侧边栏检查通过：${sections.length} 个板块、${pageCount} 页，图标齐全，折叠目录只在 ${OPENAPI_DIR}/`)
