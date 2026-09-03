// `<include>` 区段检查：MDX 引用的每个代码区段都必须在真源文件里存在。
//
// 为什么要有这个脚本：v7 文档站的示例不再手抄，`<include lang="ts" …#区段名>`
// 直接从编译得过的源文件里引。这条链有个安静的断点 —— 删掉或改名 `//#region`
// 时，源文件照样编译通过（`pnpm typecheck` 全绿），只有 `pnpm build:docs` 会在
// remarkInclude 阶段抛 `Region "X" not found`。而 `next build` 又是最重、最容易
// 被环境挡住的一步（Turbopack 起不了子进程、next/font 取不到 Google 字体都会让
// 它在 20s 内失败），于是「区段还在不在」这个廉价事实反而成了最难拿到的。
//
// 判定方式：把 fumadocs-mdx 的 `extractCodeRegion` 语义照搬过来（下面那张
// REGION_MARKERS 表逐字取自 node_modules/fumadocs-mdx/dist/remark-include-*.js，
// 它自己又是从 VitePress 的 snippet 插件改的），对每处 include 规格独立验一遍：
// 文件在不在、区段起始标记有没有、名字对不对得上。
//
// 覆盖范围有意划在**代码路径**上 —— 也就是带 `lang=` 或目标不是 `.md`/`.mdx`
// 的那些。指向 `.md`/`.mdx` 的锚点（`<section id>` 与标题 id）走的是 mdast 路径，
// 忠实复现要 unified + remarkHeading 一整套解析器依赖；与其在这儿塞一份会跑偏的
// slug 实现，不如照实标成「跳过」，那部分继续由 `build:docs` 把关。
//
// 自身失效模式的防护：一处 include 都没扫到 → exit 1。空输入下「区段全在」是
// 平凡真，和死链检查里那条 0 产物守卫同一个道理。

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'

const CONTENT_DIR = join('content', 'docs')

/** 区段标记表：逐字取自 fumadocs-mdx 的 extractCodeRegion，改一个字就会与真实解析行为脱节 */
const REGION_MARKERS = [
  { start: /^\s*\/\/\s*#?region\b\s*(.*?)\s*$/, end: /^\s*\/\/\s*#?endregion\b\s*(.*?)\s*$/ },
  { start: /^\s*<!--\s*#?region\b\s*(.*?)\s*-->/, end: /^\s*<!--\s*#?endregion\b\s*(.*?)\s*-->/ },
  { start: /^\s*\/\*\s*#region\b\s*(.*?)\s*\*\//, end: /^\s*\/\*\s*#endregion\b\s*(.*?)\s*\*\// },
  { start: /^\s*#[rR]egion\b\s*(.*?)\s*$/, end: /^\s*#[eE]nd ?[rR]egion\b\s*(.*?)\s*$/ },
  { start: /^\s*#\s*#?region\b\s*(.*?)\s*$/, end: /^\s*#\s*#?endregion\b\s*(.*?)\s*$/ },
  { start: /^\s*(?:--|::|@?REM)\s*#region\b\s*(.*?)\s*$/, end: /^\s*(?:--|::|@?REM)\s*#endregion\b\s*(.*?)\s*$/ },
  { start: /^\s*#pragma\s+region\b\s*(.*?)\s*$/, end: /^\s*#pragma\s+endregion\b\s*(.*?)\s*$/ },
  { start: /^\s*\(\*\s*#region\b\s*(.*?)\s*\*\)/, end: /^\s*\(\*\s*#endregion\b\s*(.*?)\s*\*\)/ }
]

/** 区段能不能取出来：与 extractCodeRegion 同款的「起始标记名字相等 + 找得到配对结束」 */
const hasCodeRegion = (content, region) => {
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    for (const re of REGION_MARKERS) {
      if (re.start.exec(lines[i])?.[1] !== region) continue
      let depth = 1
      for (let j = i + 1; j < lines.length; j++) {
        if (re.start.exec(lines[j])) {
          depth++
          continue
        }
        const end = re.end.exec(lines[j])
        if (!end) continue
        if (end[1] === region) depth = 0
        else if (end[1] === '') depth--
        else continue
        if (depth <= 0) return true
      }
    }
  }
  return false
}

/** `parseSpecifier`：按**最后一个** `#` 切，与 fumadocs 一致（Windows 路径里不会有 #，但别自己发明规则） */
const parseSpecifier = (specifier) => {
  const idx = specifier.lastIndexOf('#')
  if (idx === -1) return { file: specifier }
  return { file: specifier.slice(0, idx), section: specifier.slice(idx + 1) }
}

const mdxFiles = []
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) mdxFiles.push(path)
  }
}

if (!existsSync(CONTENT_DIR)) {
  console.error(`❌ 找不到 ${CONTENT_DIR} —— 这个脚本要在 packages/docs 里跑`)
  process.exit(1)
}
walk(CONTENT_DIR)

const failures = []
let checked = 0
let skipped = 0

for (const file of mdxFiles) {
  const src = readFileSync(file, 'utf8')
  // 规格是一行路径：不含 `<` `>` 与反引号、不跨行。这三条把散文里 `<include>`
  // 这样的行内代码提及挡在外面 —— 少了它们，正则会从一处提及一路吃到下一个真
  // `</include>`，把整段散文当成路径（问过一次了）。
  for (const match of src.matchAll(/<include([^>\n]*)>([^<>`\n]+)<\/include>/g)) {
    if (src[match.index - 1] === '`') continue
    const attrs = match[1]
    const specifier = match[2].trim()
    if (specifier.length === 0) continue

    const { file: relativePath, section } = parseSpecifier(specifier)
    // `cwd` 属性会让 remarkInclude 从包根而不是 MDX 所在目录解析
    const base = /\bcwd\b/.test(attrs) ? process.cwd() : dirname(file)
    const target = resolve(base, relativePath)
    const where = `${relative('.', file).split(sep).join('/')} → ${specifier}`

    if (!existsSync(target)) {
      failures.push(`${where}\n     文件不存在：${relative('.', target).split(sep).join('/')}`)
      continue
    }

    // 代码路径的判据：显式 lang= 或目标不是 .md/.mdx（与 remarkInclude 的分支同一个条件）
    const ext = extname(target)
    const isCodePath = /\blang\s*=/.test(attrs) || (ext !== '.md' && ext !== '.mdx')
    if (!isCodePath || !section) {
      skipped++
      continue
    }

    checked++
    if (!hasCodeRegion(readFileSync(target, 'utf8'), section)) {
      failures.push(`${where}\n     区段 "${section}" 取不出来 —— 源文件里没有配对的 #region/#endregion`)
    }
  }
}

const total = checked + skipped
console.log(`<include> 检查：${mdxFiles.length} 个文档里共 ${total} 处引用，代码区段验了 ${checked} 处，锚点路径跳过 ${skipped} 处（交给 build:docs）`)

if (total === 0) {
  console.error('❌ 一处 <include> 都没扫到 —— 要么正则过期了，要么文档真的不再引真源文件，两种都得先修脚本')
  process.exit(1)
}

if (failures.length === 0) {
  console.log(`✅ ${checked} 处代码区段全部存在`)
  process.exit(0)
}

console.error(`❌ ${failures.length} 处 <include> 解析不了（build:docs 会在 remarkInclude 阶段抛 Region not found）：`)
for (const line of failures) console.error(`   ${line}`)
process.exit(1)
