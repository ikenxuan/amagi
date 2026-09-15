// twoslash 检查：v7 文档里每一个 `twoslash` 代码块都必须真编译得过。
//
// 为什么不直接依赖 `pnpm build:docs`：twoslash 只在 `next dev` / `next build` 时求值，
// 而整站构建是这条链上最重、最容易被环境挡住的一步（实测两种独立失败：Turbopack
// 起不了子进程 `0xc0000142`、`next/font` 取不到 Google 字体）。示例能不能编译这件事
// 不该被 Next 的 bundler 绑住 —— twoslash 本身只要有 TypeScript 就能跑。
//
// 判定方式：扫 `content/docs/v7` 下所有 ` ```ts twoslash ` 块，逐块交给 TypeScript 真编译。
// 块里已有的 twoslash 指令原样生效 —— `@errors: <码>`（故意展示的错误）、`@noErrors`、
// `@filename` 虚拟文件、`---cut---`，见下面「指令」一节，都是本文件自己解释的，
// 所以「本页故意演示一个类型错误」不会被误判成失败。
//
// 与 build:docs 的关系是互补而非替代：这里验「能编译」，那里还验渲染结果
// （悬浮类型、`---cut---` 不进输出、死链）。
//
// 求值**不带类型缓存** —— 这里与 `next build` 都每块现跑一遍 TypeScript。
// 2026-09-14 撤掉了此前「缓存进仓库 + CI 新鲜度闸门」那套方案（理由见
// `source.config.ts` 里 `transformerTwoslash()` 上方那段），所以没有「热缓存」
// 这一档，也就没有什么需要在 CI 上核对新鲜度的东西。
//
// 自身失效模式的防护：一个 twoslash 块都没扫到 → exit 1。空输入下「全部通过」
// 是平凡真，与死链检查、`<include>` 检查里的守卫同一个道理。
//
// ---------------------------------------------------------------------------
// 2026-09-15：不再用 `twoslash` 包。
//
// 文档站迁到 TypeScript 7（Go 原生编译器，包名仍叫 `typescript`）之后，`lib/typescript.js`
// 已经不存在，而 `twoslash` 吃的正是那套 JS 编译器 API —— `import ts from 'typescript'`
// 只会拿到一个 `{ version, versionMajorMinor }` 的空壳，一调用就炸。
// 现在改用 TS7 自带的原生 API `typescript/unstable/sync`：它在本地起一个 tsgo 子进程，
// 类型信息跨进程拿回来。渲染端 `fumadocs-twoslash@4` 也就是这么干的，于是「检查」
// 与「渲染」不只是选项一致，跑编译器的整条路都一致。
//
// 编译器选项不是猜的，是从 `node_modules/.pnpm/fumadocs-twoslash@4.0.0_*/node_modules/
// fumadocs-twoslash/dist/index.js` 里读出来的：`//#region src/twoslasher.ts` 那段的
// `const defaultCompilerOptions`（strict / module: esnext / target: esnext /
// moduleResolution: bundler / moduleDetection: force / jsx: react-jsx / esModuleInterop /
// allowJs / skipLibCheck），下面原样抄了一份。`source.config.ts` 里是裸的
// `transformerTwoslash()`，没传 `twoslashOptions`，所以站点跑的就是这套默认值。
//
// ts 与 tsx 之间**没有**选项差异（jsx 对两者都是 `react-jsx`），差别只在虚拟文件名：
// 围栏是 `ts` 就建 `index.ts`，`tsx` 就建 `index.tsx`。同一份 dist 里的 `langAlias`
// 把 `typescript` 映射成 `ts`，所以 ` ```typescript twoslash ` 也按 ts 处理。
//
// 取哪些诊断同样照抄同一份 dist 的 `analyze()`：只用 `program.getSemanticDiagnostics()`
// 与 `getSyntacticDiagnostics()`。这里**刻意不多取** bind / suggestion / global 那几类 ——
// 渲染端不取，多取只会判出「站点渲染得好好的块」失败，那是假红。
//
// `moduleDetection: force` 还有一个副作用正合我意：每个虚拟文件都算模块，
// 于是把 121 个块塞进同一个工程时，块与块之间的全局声明不会互相打架。
//
// 为什么是一个工程而不是每块一个：这个 API 是**跨进程**的，起一次 tsgo 就要几百毫秒，
// 121 个 snapshot 就是分钟级。所以学渲染端的做法 —— 一块一个子目录当稳定槽位，
// 所有文件在一个 snapshot 里一次性建好，再逐文件问诊断。实测 121 块全程 ~0.7 秒，
// 其中大头是 tsgo 那一次冷启动。
// 代价是**同一次运行里块与块共享一个 program**：某个块写坏了全局东西（比如
// `declare global`）理论上会波及别人。用 `moduleDetection: force` 之外没有再防护，
// 渲染端也一样，且真出现时表现为「多报错」而不是「漏报错」，可以接受。
// ---------------------------------------------------------------------------

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

import { API } from 'typescript/unstable/sync'

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

// ---------------------------------------------------------------------------
// 指令
//
// 旧包替我们做的事，现在自己来。规则全部对着渲染端那份 dist 抄，差一处就可能在
// 「站点渲染通过、这里报错」或反过来之间摆动：
//
//   // @errors: 2322 2345   该块**故意**演示这些码，放行；别的码照样算失败
//   // @noErrors            整块不判错（`@noErrors: 2322` 则只放行列出的码）
//   // @filename: a.ts      切成多个虚拟文件，见 splitFiles
//   // ---cut--- 等         只决定**输出裁剪**，与能不能编译无关，这里一概不管
//   // @<其它名字>: 值      当作 compilerOptions 覆盖（渲染端就是这么处理的）
//
// 指令是注释，留在参与编译的源码里也不影响编译 —— 所以**不剔除**，行号因此能原样
// 对上 MDX，报错时可以直接指到文档的哪一行。
// ---------------------------------------------------------------------------

/** `// @flag` / `// @flag: value`，与渲染端同一条正则（`@` 必须顶格，缩进的指令不算） */
const RE_FLAG = /^\/\/\s?@(\w+)(?::\s?(.+))?$/gm

/** 渲染端 `customTags` 的默认值：这几个名字是**标签**不是编译选项，本脚本只判编译，跳过 */
const TAG_FLAGS = new Set(['annotate', 'log', 'warn', 'error'])

/** 渲染端 `defaultHandbookOptions` 里除 errors / noErrors 之外的指令，同样不是编译选项 */
const OTHER_HANDBOOK_FLAGS = new Set(['noErrorsCutted', 'noErrorValidation', 'noStaticSemanticInfo', 'keepNotations'])

/** 渲染端同名表：这些 compilerOption 收的是数组，单值要包一层 */
const LIST_FLAGS = new Set(['lib', 'types', 'typeRoots', 'rootDirs', 'moduleSuffixes', 'customConditions'])

/** 渲染端 parseFlagValue 的等价物：`true` / `false` / 逗号列表 / 数字 / 字符串 */
const parseFlagValue = (value) => {
  if (value === undefined || value === 'true') return true
  if (value === 'false') return false
  if (value.includes(',')) return value.split(',').map((v) => v.trim())
  const num = Number(value)
  return Number.isNaN(num) ? value : num
}

/**
 * `@errors` / `@noErrors` 后面的错误码。渲染端按空格切，这里连逗号一起认 ——
 * 宽松一点只会少一次「码写对了却被判错」，不会放过别的错。
 */
const splitCodes = (value) =>
  (value ?? '')
    .split(/[\s,]+/)
    .map(Number)
    .filter((code) => Number.isInteger(code))

/** 解析一块里的指令 */
const parseFlags = (code) => {
  const handbook = { errors: [], noErrors: false, noErrorValidation: false }
  const overrides = {}
  for (const [, name, value] of code.matchAll(RE_FLAG)) {
    if (name === 'filename') continue // splitFiles 管
    if (TAG_FLAGS.has(name)) continue
    if (name === 'errors') {
      handbook.errors.push(...splitCodes(value))
      continue
    }
    if (name === 'noErrors') {
      const parsed = parseFlagValue(value)
      handbook.noErrors = typeof parsed === 'boolean' ? parsed : splitCodes(value)
      continue
    }
    if (OTHER_HANDBOOK_FLAGS.has(name)) {
      if (name === 'noErrorValidation') handbook.noErrorValidation = parseFlagValue(value) === true
      continue
    }
    const parsed = parseFlagValue(value)
    overrides[name] = LIST_FLAGS.has(name) && !Array.isArray(parsed) ? [parsed] : parsed
  }
  return { handbook, overrides }
}

/**
 * 按 `// @filename: xxx` 把一块切成多个虚拟文件（渲染端 `splitFiles` 的等价物）。
 * **本仓库文档至今没用过这条指令**，实现它是为了别在有人开始用之后悄悄判错：
 * 用 `offset` 记住每段在原块里的起点，报错行号才能换算回 MDX。
 *
 * 只保留 ts / tsx / js / jsx —— 渲染端也是这么过滤的（`.json` 要 `resolveJsonModule`
 * 才收，`allowJs: true` 让 js / jsx 也能进）。
 */
const RE_FILENAME = /^[\t\v\f ]*\/\/\s?@filename: (.+)$/gm
const SUPPORTED_EXTENSIONS = new Set(['ts', 'tsx', 'js', 'jsx'])

const splitFiles = (code, defaultFilename) => {
  const out = []
  let filename = defaultFilename
  let index = 0
  const push = (end) => {
    if (end === index) return
    const extension = filename.slice(filename.lastIndexOf('.') + 1)
    if (SUPPORTED_EXTENSIONS.has(extension)) out.push({ filename, offset: index, content: code.slice(index, end) })
  }
  for (const match of code.matchAll(RE_FILENAME)) {
    push(match.index)
    filename = match[1].trimEnd()
    index = match.index
  }
  push(code.length)
  return out
}

// ---------------------------------------------------------------------------
// 虚拟工程
// ---------------------------------------------------------------------------

/** 抄自 fumadocs-twoslash dist 的 defaultCompilerOptions，理由见文件头 */
const COMPILER_OPTIONS = {
  strict: true,
  module: 'esnext',
  target: 'esnext',
  moduleResolution: 'bundler',
  moduleDetection: 'force',
  jsx: 'react-jsx',
  esModuleInterop: true,
  allowJs: true,
  skipLibCheck: true
}

/**
 * 虚拟根目录：`.twoslash/` 下第 i 块放第 i 个子目录。**磁盘上没有这个目录** ——
 * 下面那套 fs 回调把根目录以内的路径全部接管（查不到就是「不存在」，不回退真盘）。
 * 根目录以外一律 `undefined`，让 tsgo 自己读真盘，`@ikenxuan/amagi` / `@types/*`
 * 才解析得到。
 */
const VIRTUAL_ROOT = `${normalizePath(resolve('.twoslash'))}/`

/** 渲染端同名函数：统一分隔符，Windows 上再把盘符压成小写。tsgo 回的路径就是这形状 */
function normalizePath(path) {
  path = path.replaceAll('\\', '/')
  if (process.platform === 'win32' && /^[A-Z]:/.test(path)) path = path[0].toLowerCase() + path.slice(1)
  return path
}

const blocks = []
for (const file of mdxFiles) {
  const shown = relative('.', file).split(sep).join('/')
  for (const block of collectBlocks(readFileSync(file, 'utf8'))) {
    const { handbook, overrides } = parseFlags(block.code)
    const options = JSON.stringify({ ...COMPILER_OPTIONS, ...overrides })
    const dir = `${VIRTUAL_ROOT}${blocks.length}/`
    blocks.push({
      where: `${shown}:${block.line}`,
      line: block.line,
      code: block.code,
      dir,
      options,
      handbook,
      files: splitFiles(block.code, `index.${block.lang}`)
    })
  }
}

console.log(`twoslash 检查：${mdxFiles.length} 个文档里 ${blocks.length} 个 twoslash 块`)

if (blocks.length === 0) {
  console.error('❌ 一个 twoslash 块都没扫到 —— 要么围栏正则过期了，要么示例真的不再检查类型，两种都得先修脚本')
  process.exit(1)
}

// 编译选项相同的块共用一个 tsconfig（今天的文档里就是全部 121 块共用一个）。
// 每个 tsconfig 只列**自己那些块**的文件 —— 渲染端会把全部文件都列进每个 tsconfig，
// 那是因为它的文件表跨 snapshot 只增不减；这里一次建完，没这个包袱。
const configs = new Map()
for (const block of blocks) {
  let config = configs.get(block.options)
  if (!config) {
    config = { path: `${VIRTUAL_ROOT}tsconfig.${configs.size}.json`, files: [] }
    configs.set(block.options, config)
  }
  block.configPath = config.path
  for (const file of block.files) config.files.push(normalizePath(`${block.dir}${file.filename}`))
}

const virtualFiles = new Map()
const virtualDirs = new Set([VIRTUAL_ROOT.slice(0, -1)])
for (const block of blocks) {
  for (const file of block.files) {
    const path = normalizePath(`${block.dir}${file.filename}`)
    virtualFiles.set(path, file.content)
    for (let i = path.lastIndexOf('/'); i >= VIRTUAL_ROOT.length; i = path.lastIndexOf('/', i - 1)) virtualDirs.add(path.slice(0, i))
  }
}
for (const [options, config] of configs) {
  virtualFiles.set(normalizePath(config.path), `{"compilerOptions":${options},"files":${JSON.stringify(config.files)}}`)
}

// ---------------------------------------------------------------------------
// 编译
// ---------------------------------------------------------------------------

let api
let snapshot
try {
  api = new API({
    cwd: VIRTUAL_ROOT,
    fs: {
      readFile: (file) => {
        const path = normalizePath(file)
        if (virtualFiles.has(path)) return virtualFiles.get(path)
        // 虚拟根以内查不到就是「不存在」，返回 null 挡住真盘回退：否则一个拼错的
        // 虚拟文件名会悄悄读到磁盘上的同名文件，检查就假绿了
        return path.startsWith(VIRTUAL_ROOT) ? null : undefined
      },
      fileExists: (file) => {
        const path = normalizePath(file)
        return path.startsWith(VIRTUAL_ROOT) ? virtualFiles.has(path) : undefined
      },
      directoryExists: (dir) => {
        const path = normalizePath(dir)
        return virtualDirs.has(path) || (path.startsWith(VIRTUAL_ROOT) ? false : undefined)
      }
    }
  })
  snapshot = api.updateSnapshot({
    openProjects: [...configs.values()].map((config) => config.path),
    fileChanges: { created: [...virtualFiles.keys()] }
  })
} catch (error) {
  console.error(
    `❌ 起不了 TypeScript 7 的编译器进程（typescript/unstable/sync）：${error instanceof Error ? error.message : String(error)}`
  )
  api?.close()
  process.exit(1)
}

/** 诊断多行展开（messageChain 里往往才是真正的原因） */
const flatten = (diagnostic, indent = 0) => {
  let text = '  '.repeat(indent) + diagnostic.text
  for (const chain of diagnostic.messageChain ?? []) text += `\n${flatten(chain, indent + 1)}`
  return text
}

/** 块内偏移 → MDX 行号（虚拟文件里一个字符都没删，所以行号能原样对上） */
const mdxLineOf = (block, offset) => {
  const before = block.code.slice(0, offset)
  return block.line + before.split('\n').length
}

const failures = []
/** 真的送进编译器的块数：切不出虚拟文件（空块 / 后缀不支持）的不算，与旧 twoslash 行为一致 */
let compiled = 0

for (const block of blocks) {
  const project = snapshot.getProject(block.configPath)
  if (!project) {
    failures.push({ where: block.where, message: `虚拟工程加载失败：${block.configPath}` })
    continue
  }
  // 每条指令都是注释，注释不会让块编译不过，但**选项本身写错**（比如 `// @lib: 不存在的库`）
  // 会在这里冒出来。渲染端遇到这个直接抛「Invalid compiler options」，照做。
  const configErrors = project.program.getConfigFileParsingDiagnostics()
  if (configErrors.length > 0) {
    failures.push({ where: block.where, message: `compilerOptions 解析失败：\n${configErrors.map((d) => flatten(d)).join('\n')}` })
    continue
  }
  if (block.files.length === 0) continue
  compiled++
  if (block.handbook.noErrors === true) continue
  if (block.handbook.noErrorValidation) continue

  const ignored = new Set([...block.handbook.errors, ...(Array.isArray(block.handbook.noErrors) ? block.handbook.noErrors : [])])
  const diagnostics = []
  for (const file of block.files) {
    const path = normalizePath(`${block.dir}${file.filename}`)
    for (const diagnostic of project.program.getSemanticDiagnostics(path)) diagnostics.push({ file, diagnostic })
    for (const diagnostic of project.program.getSyntacticDiagnostics(path)) diagnostics.push({ file, diagnostic })
  }

  const unexpected = diagnostics
    .filter(({ diagnostic }) => !ignored.has(diagnostic.code))
    .toSorted((a, b) => a.diagnostic.pos - b.diagnostic.pos)
  if (unexpected.length === 0) continue

  const lines = [
    block.handbook.errors.length > 0
      ? `出现未在 @errors 里声明的错误（已放行 ${block.handbook.errors.join(' ')}）：`
      : '出现错误（加 `// @errors: <码>` 可以把有意演示的码放行）：'
  ]
  for (const { file, diagnostic } of unexpected.slice(0, 4)) {
    lines.push(`[TS${diagnostic.code}] 第 ${mdxLineOf(block, file.offset + diagnostic.pos)} 行 ${flatten(diagnostic)}`)
  }
  if (unexpected.length > 4) lines.push(`… 另有 ${unexpected.length - 4} 条`)
  failures.push({ where: block.where, message: lines.join('\n') })
}

api.close()

if (compiled === 0) {
  console.error('❌ 一个块都没真的进编译器（虚拟文件一个都没切出来）—— 空输入下「全部通过」是平凡真，先修脚本')
  process.exit(1)
}

if (failures.length === 0) {
  console.log(`✅ ${blocks.length} 个块全部编译通过`)
  process.exit(0)
}

console.error(`❌ ${failures.length} 个块编译不过：`)
for (const { where, message } of failures) {
  console.error(`   ${where}`)
  for (const line of message.split('\n').slice(0, 6)) console.error(`     ${line}`)
}
process.exit(1)
