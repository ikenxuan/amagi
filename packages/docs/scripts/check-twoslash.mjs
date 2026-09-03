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

import { readFileSync, readdirSync } from 'node:fs'
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

if (checked === 0) {
  console.error('❌ 一个 twoslash 块都没扫到 —— 要么围栏正则过期了，要么示例真的不再检查类型，两种都得先修脚本')
  process.exit(1)
}

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
