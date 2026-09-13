// twoslash 检查：v7 文档里每一个 `twoslash` 代码块都必须真编译得过。
//
// 为什么不直接依赖 `pnpm build:docs`：twoslash 只在 `next dev` / `next build` 时求值，
// 而整站构建是这条链上最重、最容易被环境挡住的一步（实测两种独立失败：Turbopack
// 起不了子进程 `0xc0000142`、`next/font` 取不到 Google 字体）。示例能不能编译这件事
// 不该被 Next 的 bundler 绑住 —— twoslash 本身只要有 TypeScript 就能跑。
//
// 判定方式：扫 `content/docs/v7` 下所有 ` ```ts twoslash ` 块，逐块交给
// `createTwoslasher()`（与文档站同一个 twoslash 包、同一套默认 compilerOptions）。
// 块里已有的 twoslash 指令原样生效 —— `@filename` 虚拟文件、`---cut---`、
// `@errors: <码>`（故意展示的错误）、`@noErrors`，都由 twoslash 自己处理，
// 所以「本页故意演示一个类型错误」不会被误判成失败。
//
// 与 build:docs 的关系是互补而非替代：这里验「能编译」，那里还验渲染结果
// （悬浮类型、`---cut---` 不进输出、死链）。
//
// 自身失效模式的防护：一个 twoslash 块都没扫到 → exit 1。空输入下「全部通过」
// 是平凡真，与死链检查、`<include>` 检查里的守卫同一个道理。

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { createTwoslasher } from 'twoslash'

const CONTENT_DIR = join('content', 'docs', 'v7')

/** 取一个 MDX 里所有 twoslash 代码块：{ 起始行号, 语言, 源码 } */
const collectBlocks = (text) => {
  const lines = text.split(/\r?\n/)
  const blocks = []
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^```(ts|tsx|typescript)(\s+.*)?$/)
    if (!open) continue
    const meta = open[2] ?? ''
    // 收集到配对的结束围栏为止（无论是否 twoslash，都要跳过整块，
    // 否则块内出现的 ``` 会被当成新的开头）
    const body = []
    let end = i + 1
    while (end < lines.length && !/^```\s*$/.test(lines[end])) {
      body.push(lines[end])
      end++
    }
    if (/\btwoslash\b/.test(meta)) {
      blocks.push({ line: i + 1, lang: open[1] === 'typescript' ? 'ts' : open[1], code: body.join('\n') })
    }
    i = end
  }
  return blocks
}

const mdxFiles = []
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (entry.name.endsWith('.mdx')) mdxFiles.push(path)
  }
}

walk(CONTENT_DIR)

/**
 * 开发者文档不做 twoslash。
 *
 * 理由不是「省钱」而是「不值得」：`v7/dev` 一共只有 6 个代码块用 twoslash，
 * 而 twoslash 的代价是按块计的（每块一次 TypeScript 求值）。这 6 块换来的是
 * 「正文里悬停看类型」，但那一板块的读者是改 amagi 本身的人 —— 他们手边就有
 * 源码和编辑器，悬停浮层帮不上什么，却要为它付整条 `typescript` 的初始化。
 *
 * 更要紧的是**它得是显式的**：以前那 6 个块的 `// ---cut---` 与 `// @noErrors`
 * 是靠 twoslash 加工掉的，一旦这里被悄悄跳过，这些标记就会原样显示在页面上。
 * 所以判据是「源码里不许出现 twoslash 围栏」，而不是运行期把它剥掉 ——
 * 文件自己说清楚它渲染成什么。
 *
 * 自身失效模式的防护：这一条扫不到任何文件时不算通过（与其它检查同一个道理）。
 */
const DEV_DIR = join('content', 'docs', 'v7', 'dev')
const devFiles = []
const walkDev = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walkDev(path)
    else if (entry.name.endsWith('.mdx')) devFiles.push(path)
  }
}

if (existsSync(DEV_DIR)) {
  walkDev(DEV_DIR)
  const offenders = []
  for (const file of devFiles) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    lines.forEach((line, index) => {
      if (/^```(ts|tsx|typescript)\s+.*\btwoslash\b/.test(line)) offenders.push(`${relative('.', file).split(sep).join('/')}:${index + 1}`)
    })
  }
  if (offenders.length > 0) {
    console.error(`❌ 开发者文档里出现了 ${offenders.length} 个 twoslash 代码块 —— 那一板块不做 twoslash：`)
    for (const item of offenders) console.error(`   ${item}`)
    console.error('   去掉围栏上的 `twoslash` 关键字，并把 `// ---cut---` / `// @noErrors` 之类')
    console.error('   依赖 twoslash 加工才能隐藏的标记一并删掉（否则它们会原样显示在页面上）。')
    process.exit(1)
  }
  console.log(`✅ 开发者文档（${devFiles.length} 篇）未使用 twoslash`)
} else {
  console.error(`❌ 找不到 ${DEV_DIR} —— 这条判据扫不到东西，不能当作通过`)
  process.exit(1)
}

const twoslasher = createTwoslasher()
const failures = []
let checked = 0

for (const file of mdxFiles) {
  const shown = relative('.', file).split(sep).join('/')
  for (const block of collectBlocks(readFileSync(file, 'utf8'))) {
    checked++
    try {
      twoslasher(block.code, block.lang)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push({ where: `${shown}:${block.line}`, message })
    }
  }
}

console.log(`twoslash 检查：${mdxFiles.length} 个文档里 ${checked} 个 twoslash 块`)

  function checkCacheFreshness() {
  /**
   * 类型缓存的新鲜度闸门。
   *
   * `source.config.ts` 把 twoslash 的类型缓存指向仓库里的 `.twoslash-cache/`
   * （由 `pnpm docs:twoslash-cache` 预生成），为的是让**永远是冷构建**的 CI
   * 也能命中缓存 —— 没有它，编译阶段峰值会翻倍，GitHub 托管 runner 那 7 GiB
   * 直接 OOM（2026-09-12 两次 `exit code 143`）。
   *
   * 但缓存键**只有代码文本**：改了示例却忘了重跑那个脚本时，构建会拿着旧结果
   * 当作新结果用 —— 类型浮层是错的，而且**不报错**。所以在这里钉住：
   *
   * 1. 每个 twoslash 块都得在缓存里有对应文件（键 = 代码的 SHA256 前 12 位，
   *    与 `fumadocs-twoslash/cache-fs` 的算法一致）；
   * 2. `_meta.json` 里记的 typescript / twoslash / fumadocs-twoslash 版本与
   *    tsconfig 内容，必须与此刻的环境逐字相同（缓存键不含这些输入，
   *    它们变了缓存不会自动失效）。
   *
   * 自身失效模式的防护：缓存目录不存在、或 `_meta.json` 缺失 → exit 1
   * （「没有问题」在空输入下是平凡真，与本站其它检查同一个道理）。
   */
  const CACHE_DIR = '.twoslash-cache'

  if (!existsSync(CACHE_DIR)) {
    console.error(`❌ 找不到 ${CACHE_DIR}/ —— 跑 \`pnpm docs:twoslash-cache\` 生成并提交。`)
    process.exit(1)
  }

  const metaPath = join(CACHE_DIR, '_meta.json')
  if (!existsSync(metaPath)) {
    console.error(`❌ ${CACHE_DIR}/_meta.json 缺失 —— 跑 \`pnpm docs:twoslash-cache\` 重新生成。`)
    process.exit(1)
  }

  const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  const readVersion = (name) => JSON.parse(readFileSync(join('node_modules', name, 'package.json'), 'utf8')).version
  const current = {
    typescript: readVersion('typescript'),
    twoslash: readVersion('twoslash'),
    fumadocsTwoslash: readVersion('fumadocs-twoslash'),
    tsconfig: readFileSync('tsconfig.json', 'utf8')
  }

  const drifted = Object.keys(current).filter((key) => current[key] !== meta[key])
  if (drifted.length > 0) {
    console.error(`❌ twoslash 缓存已过时：${drifted.join(' / ')} 变了，而缓存键不含这些输入。`)
    console.error('   跑 `pnpm docs:twoslash-cache` 重新生成并提交。')
    process.exit(1)
  }

  const cacheKey = (code) => createHash('SHA256').update(code).digest('hex').slice(0, 12)
  const cached = new Set(readdirSync(CACHE_DIR).filter((name) => name.endsWith('.json')))
  const missed = []
  for (const file of mdxFiles) {
    for (const block of collectBlocks(readFileSync(file, 'utf8'))) {
      const key = `${cacheKey(block.code)}.json`
      if (!cached.has(key)) missed.push(`${relative(CONTENT_DIR, file)}:${block.line}`)
    }
  }

  if (missed.length > 0) {
    console.error(`❌ 缓存里缺这 ${missed.length} 个 twoslash 块的类型结果：`)
    for (const item of missed.slice(0, 10)) console.error(`   ${item}`)
    if (missed.length > 10) console.error(`   …还有 ${missed.length - 10} 处`)
    console.error('   跑 `pnpm docs:twoslash-cache` 重新生成并提交。')
    process.exit(1)
  }

  console.log(`✅ twoslash 缓存新鲜：${cached.size} 条，覆盖全部 ${mdxFiles.length} 个 MDX 里的块`)

}

if (checked === 0) {
  console.error('❌ 一个 twoslash 块都没扫到 —— 要么围栏正则过期了，要么示例真的不再检查类型，两种都得先修脚本')
  process.exit(1)
}

checkCacheFreshness()

if (failures.length === 0) {
  console.log(`✅ ${checked} 个块全部编译通过`)
  process.exit(0)
}

console.error(`❌ ${failures.length} 个块编译不过：`)
for (const { where, message } of failures) {
  console.error(`   ${where}`)
  for (const line of message.split('\n').slice(0, 6)) console.error(`     ${line}`)
}
process.exit(1)
