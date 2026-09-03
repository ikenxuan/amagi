// v6 → v7 迁移变换 —— 06-migration「codemod」节逐条实现（纯文本启发式，不解析 AST）。
//
// 顺序执行的 9 条规则（对每个文件）：
//   1. typeMode-strict        删 `typeMode: 'strict'`（现在是默认行为）
//   2. typeMode-loose         删 `typeMode: 'loose'`，文件头注入一条 TODO
//   3. error-amagiError       r.error.amagiError.errorDescription → r.error.message
//   4. error-errorDescription r.error.errorDescription → r.error.message
//   5. register-routes        registerXxxRoutes( → createXxxRoutes(
//   6. api-routes-import      从 import 语句删除 XxxApiRoutes 具名导入，文件头注入 TODO
//   7. r-code-read            r.code 读法：不删码，文件头注入一条 TODO
//   8. validation-catch       catch 块内含校验错误字样的文件：文件头注入一条 TODO
//   9. events-payload-meta    **实例总线**监听器的负载读法进 meta（顶层 amagiEvents 不动）
//
// 规则跑之前先把已有的 `// TODO(amagi-v7):` 行换成哨符（maskTodoLines）——
// 这些文案本身引用 v6 字面量，不屏蔽的话第二次运行会把它们改坏。**幂等的前提。**
//
// 已知边界（不在规则内，留给人工）：
//   - `import { registerXxxRoutes } from ...` 具名导入本身不重写（规则只处理
//     括号调用形式 registerXxxRoutes(...)）
//   - `export { XxxApiRoutes } from ...` 再导出语句不在规则 6 内
//   - 规则 9 只看**本文件内**的 import 与赋值：跨文件传进来的 client（函数形参、
//     自己包的工厂）判不出来源，按纪律标 TODO 而不是猜

export type RuleName =
  | 'typeMode-strict'
  | 'typeMode-loose'
  | 'error-amagiError'
  | 'error-errorDescription'
  | 'register-routes'
  | 'api-routes-import'
  | 'r-code-read'
  | 'validation-catch'
  | 'events-payload-meta'

export interface Change {
  /** 由 runCodemod 聚合到文件级报告时携带的相对路径 */
  file?: string
  rule: RuleName
  /**
   * 文本替换/删除的命中次数。
   *
   * 含「只检测不改码」的命中：`r-code-read` 是读法命中数，
   * `events-payload-meta` 是「改写的读法 + 只标注的 `timestamp` 读法 + 改不动的注册点」之和。
   */
  count: number
  /** 本规则注入的 TODO(amagi-v7:) 行（每文件每种文本至多一条） */
  todos?: string[]
}

export interface TransformResult {
  code: string
  changes: Change[]
  /** 本次真正新写进文件头的 TODO 行（已存在的不重复计入） */
  injected: string[]
}

// ---- TODO(amagi-v7:) 文案（06-migration「codemod」节与 PRD 阶段 7 判据锁定）----

const TODO_PREFIX = '// TODO(amagi-v7):'

export const TODO_LOOSE = `${TODO_PREFIX} typeMode: 'loose' 已删 —— 原为宽松 any，v7 返回具体类型，检查 r.data 读法`
export const TODO_API_ROUTES = (name: string): string =>
  `${TODO_PREFIX} ${name} 已删除（06-migration 删除清单）——需要路由信息改用 client.endpoints()`
export const TODO_R_CODE = `${TODO_PREFIX} r.code 顶层已删 —— 失败分支改用 r.error.platform?.code ?? r.error.code，成功分支删除该读法`
export const TODO_VALIDATION = `${TODO_PREFIX} 校验失败不再抛出 —— v7 返回 failure 信封（error.kind === 'validation' 带 issues），检查 try/catch 语义`

// 规则 9 的四条：前两条跟着**已改写**的读法走（改完还有事要做），
// 后两条是**没改**的注册点（改不动，交回人工）。
export const TODO_EVENT_ENDPOINT = `${TODO_PREFIX} d.methodType 已改写成 d.meta.endpoint —— 值也变了（'videoWork' → 'douyin.videoWork'，端点全名带平台前缀），核对按值比较与打点的地方`
export const TODO_EVENT_TIMESTAMP = `${TODO_PREFIX} 实例总线负载不再带 timestamp（log:* 也没有）—— 删掉该读法，或改用监听器里自己的时钟`
export const TODO_EVENT_SOURCE = `${TODO_PREFIX} 分不清这个监听器挂在实例总线还是顶层 amagiEvents —— 实例总线负载已进 meta（d.platform → d.meta.platform），全局单例一字未变，确认来源后再改`
export const TODO_EVENT_MANUAL = `${TODO_PREFIX} 实例总线监听器不是内联函数（或负载参数被解构）—— 负载读法已进 meta（d.platform → d.meta.platform、d.errorMessage → d.error.message），去处理函数里手改`

// ---- 规则 1/2：删除 typeMode 键（'strict' / 'loose'）----
//
// 三种形态：
//   A. 键独立成行（含行首缩进与尾逗号）→ 整行删除
//   B. 键与其它键同行、前面有逗号 → 连同上一个键的逗号一起删除
//   C. 剩余内联形态（对象首键、行首键等）→ 删除键本身及其尾逗号与后续空白

function removeTypeModeKey(text: string, value: 'strict' | 'loose'): { text: string; removed: number } {
  let removed = 0

  // A. 独立成行
  const ownLine = new RegExp(`^[ \\t]*typeMode\\s*:\\s*'${value}'\\s*,?[ \\t]*(?:\\r?\\n|$)`, 'gm')
  let code = text.replace(ownLine, () => {
    removed += 1
    return ''
  })

  // B. 同行内、前有逗号
  const before = new RegExp(`,\\s*typeMode\\s*:\\s*'${value}'`, 'g')
  code = code.replace(before, () => {
    removed += 1
    return ''
  })

  // C. 剩余内联形态
  const rest = new RegExp(`typeMode\\s*:\\s*'${value}'\\s*,?[ \\t]*`, 'g')
  code = code.replace(rest, () => {
    removed += 1
    return ''
  })

  return { text: code, removed }
}

// ---- 规则 3/4：error 读法替换（先 amagiError 链，后普通链；先替换的已变成
// `$1.error.message`，不会与普通链二次命中）----

function replaceErrorReads(text: string, kind: 'amagiError' | 'plain'): { text: string; count: number } {
  const pattern = kind === 'amagiError' ? /(\w+)\.error\.amagiError\.errorDescription/g : /(\w+)\.error\.errorDescription/g
  let count = 0
  const code = text.replace(pattern, (_m, base: string) => {
    count += 1
    return `${base}.error.message`
  })
  return { text: code, count }
}

// ---- 规则 5：registerXxxRoutes( → createXxxRoutes( ----

const REGISTER_ROUTES_RE = /register(Douyin|Bilibili|Kuaishou|Xiaohongshu)Routes\(/g

// ---- 规则 6：import 语句里删除 XxxApiRoutes 具名导入 ----
// 平台名由下方 scan 正则内联枚举，无需单独常量表。

/** 单条 import 语句里删除一个 XxxApiRoutes 名字；名字独立成行则删行。 */
function stripApiRouteName(stmt: string, name: string): { text: string; removed: number } {
  let removed = 0
  const nameRe = `(?:type\\s+)?${name}\\b`
  const lines = stmt.split('\n')
  const kept: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    const base = trimmed.startsWith('type ') ? trimmed.slice(5) : trimmed
    if (base === name || base === `${name},`) {
      // 名字单独成行 → 删整行
      removed += 1
      continue
    }
    let out = line
      // 同行且前有逗号（上一个 specifier 的逗号一起删）
      .replace(new RegExp(`,\\s*${nameRe}`, 'g'), () => {
        removed += 1
        return ''
      })
      // 剩余形态（行首 specifier 等）：删名字及其尾逗号
      .replace(new RegExp(`${nameRe}\\s*,?[ \\t]*`, 'g'), () => {
        removed += 1
        return ''
      })
    kept.push(out)
  }
  return { text: kept.join('\n'), removed }
}

/**
 * 处理一条含 XxxApiRoutes 的 import 语句。
 * 返回 text 为 null 表示整条 import 删除（括号内已空且无 default 导入）。
 */
function stripApiRoutes(stmt: string): { text: string | null; removed: number } {
  const seen: string[] = []
  const scan = /(Douyin|Bilibili|Kuaishou|Xiaohongshu)ApiRoutes\b/g
  for (const m of stmt.matchAll(scan)) {
    const name = `${m[1]}ApiRoutes`
    if (!seen.includes(name)) seen.push(name)
  }
  if (seen.length === 0) return { text: stmt, removed: 0 }

  let cur = stmt
  let removed = 0
  for (const name of seen) {
    const r = stripApiRouteName(cur, name)
    cur = r.text
    removed += r.removed
  }

  // 括号内容只剩空白：整条语句删除；有 default 导入（head 以逗号结尾）则收成
  // `import def from '...'`
  const open = cur.indexOf('{')
  const close = open === -1 ? -1 : cur.indexOf('}', open + 1)
  if (open !== -1 && close !== -1 && /^\s*$/.test(cur.slice(open + 1, close))) {
    const head = cur.slice(0, open).trimEnd()
    if (head.endsWith(',')) {
      const tail = cur.slice(close + 1).trimStart()
      return { text: `${head.slice(0, -1)} ${tail}`.trimEnd(), removed }
    }
    return { text: null, removed }
  }
  return { text: cur, removed }
}

/**
 * import 语句整体识别（可跨行、可带 `import type`）。
 *
 * 默认导入 + 具名的混合形态（`import amagi, { XxxApiRoutes } from '...'`）也要
 * 命中 —— 否则这类语句整条不进 stripApiRoutes，既不删名字也不注入 TODO。
 */
const IMPORT_STMT_RE = /import\s+(?:type\s+)?(?:[A-Za-z_$][\w$]*\s*,\s*)?\{[\s\S]*?\}\s*from\s*['"][^'"]*['"]/g

function removeApiRouteImports(text: string): {
  text: string
  removed: number
  names: string[]
} {
  const names: string[] = []
  const pushName = (name: string): void => {
    if (!names.includes(name)) names.push(name)
  }
  let removed = 0
  let last = 0
  let code = ''
  for (const m of text.matchAll(IMPORT_STMT_RE)) {
    code += text.slice(last, m.index)
    const r = stripApiRoutes(m[0])
    if (r.removed > 0) {
      removed += r.removed
      const scan = /(Douyin|Bilibili|Kuaishou|Xiaohongshu)ApiRoutes\b/g
      for (const sm of m[0].matchAll(scan)) pushName(`${sm[1]}ApiRoutes`)
    }
    if (r.text === null) {
      // 整条删除时吃掉紧随其后的行尾符，避免留下空行
      let after = m.index! + m[0].length
      if (text[after] === '\r' && text[after + 1] === '\n') after += 2
      else if (text[after] === '\n') after += 1
      last = after
    } else {
      code += r.text
      last = m.index! + m[0].length
    }
  }
  code += text.slice(last)
  return { text: code, removed, names }
}

// ---- 规则 7：r.code 读法（不删码，文件头 TODO 一次）----

const R_CODE_RE = /\b\w+\.code\b/g

// ---- 规则 8：try/catch 里的校验错误处理 ----

const VALIDATION_MARKERS = /\bZodError\b|\bvalidate(?:Douyin|Bilibili|Kuaishou|Xiaohongshu)Params\b|\w+\.issues/

/** 启发式：某个 catch 块体内出现校验错误字样（validateXxxParams / e.issues / ZodError）。 */
function hasValidationCatch(code: string): boolean {
  const re = /\bcatch\b/g
  for (;;) {
    const m = re.exec(code)
    if (!m) return false
    let i = re.lastIndex
    while (i < code.length && /\s/.test(code[i])) i++
    if (code[i] === '(') {
      let depth = 0
      for (; i < code.length; i++) {
        if (code[i] === '(') depth += 1
        else if (code[i] === ')') {
          depth -= 1
          if (depth === 0) {
            i += 1
            break
          }
        }
      }
      while (i < code.length && /\s/.test(code[i])) i++
    }
    if (code[i] !== '{') continue
    let depth = 0
    const start = i
    for (; i < code.length; i++) {
      if (code[i] === '{') depth += 1
      else if (code[i] === '}') {
        depth -= 1
        if (depth === 0) break
      }
    }
    if (VALIDATION_MARKERS.test(code.slice(start, i))) return true
  }
}

// ---- 规则 9：实例总线监听器的负载读法进 meta ----
//
// v7 把调用相关的字段收进 `meta`（`packages/core/src/runtime/events.ts` 的
// `AmagiBusEventMap`），而顶层 `amagiEvents` 仍是 v6 全局单例、负载**一字未改**
// （`packages/core/src/model/events.ts`）。所以这条规则的难点不是替换，是
// **区分来源** —— 改错方向就是把好代码改坏。
//
// | v6 平铺读法 | v7 实例总线读法 |
// | --- | --- |
// | `d.platform`     | `d.meta.platform` |
// | `d.methodType`   | `d.meta.endpoint`（**值也变了**：`videoWork` → `douyin.videoWork`） |
// | `d.duration`     | `d.meta.durationMs`（都是整次调用的毫秒数，纯改名） |
// | `d.errorMessage` | `d.error.message` |
// | `d.timestamp`    | 无对应键 —— 只标 TODO，不动码（理由见下） |
//
// 来源判定（纯文本，靠 import 与赋值语句建名单）：
//   - 全局单例（**一律跳过**）：`amagiEvents` 具名导入的本地名；默认导入名
//     **未被调用**时的 `amagi.on(...)` / `amagi.events.on(...)`（`src/index.ts`
//     把静态 `on` / `events` 直接绑在 `amagiEvents` 上）
//   - 实例总线（**改写**）：`const c = amagi(...)` / `createClient(...)` /
//     `createAmagiClient(...)` 的左值、这些左值的 `.events` 别名，以及内联的
//     `amagi({...}).on(...)`
//   - 两张名单都不认识 → 不动码，标 TODO_EVENT_SOURCE
//
// `d.timestamp` 刻意**不删码**：06-migration 那一行写的是「删掉或改用自己的时钟」
// —— 两个选项，codemod 替不了用户选；而删掉一个表达式随时会造出
// `console.log(, d.message)` 这种语法错误。纪律同规则 7（`r.code`）：只标注不动码，
// 剩下的交给编译器 —— v7 负载类型里没有 `timestamp`，tsc 会指到那一行。

/** 实例总线的 15 个事件名，以 `packages/core/src/runtime/events.ts` 的 `AmagiBusEventMap` 为准 */
const BUS_EVENT_NAMES = new Set([
  'log:info',
  'log:warn',
  'log:error',
  'log:debug',
  'log:mark',
  'http:request',
  'http:response',
  'http:error',
  'network:retry',
  'network:error',
  'api:success',
  'api:error',
  'session:state',
  'session:error',
  'session:success'
])

/** 平铺 → 进 meta 的读法映射。`timestamp` 不在表内：它只标注、不改码 */
const PAYLOAD_READS: ReadonlyArray<readonly [string, string]> = [
  ['platform', 'meta.platform'],
  ['methodType', 'meta.endpoint'],
  ['duration', 'meta.durationMs'],
  ['errorMessage', 'error.message']
]

/** 造 client 实例的具名工厂（v6 的 `createAmagiClient` 与 v7 的 `createClient`） */
const CLIENT_FACTORY_NAMES = ['createClient', 'createAmagiClient']

/** 本文件内解析出来的三张名单 */
interface EventBusNames {
  /** v6 全局单例的持有者：负载一字未变，绝不改写 */
  global: Set<string>
  /** v7 实例总线的持有者：client 实例，或它的 `.events` 别名 */
  instance: Set<string>
  /** 调用一下就得到 client 实例的工厂名（含默认导入名） */
  factory: Set<string>
}

// 默认导入（可带具名部分）：`import amagi from '...'` / `import amagi, { x } from '...'`。
// `import type { X } from '...'` 不会命中 —— 具名部分要求前面有逗号。
const AMAGI_DEFAULT_IMPORT_RE = /import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{([\s\S]*?)\})?\s*from\s*['"]@ikenxuan\/amagi(?:\/[^'"]*)?['"]/g
const AMAGI_NAMED_IMPORT_RE = /import\s+(?:type\s+)?\{([\s\S]*?)\}\s*from\s*['"]@ikenxuan\/amagi(?:\/[^'"]*)?['"]/g
const CLIENT_ASSIGN_RE = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:new\s+)?([A-Za-z_$][\w$]*)\s*\(/g
const EVENTS_ALIAS_RE = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*\.\s*events\b/g

/** 拆 import 大括号里的 specifier，返回 [导入名, 本地名]，`type` 前缀与 `as` 别名都处理 */
function parseSpecifiers(body: string): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const raw of body.split(',')) {
    const s = raw.trim().replace(/^type\s+/, '')
    const m = /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(s)
    if (m !== null) out.push([m[1], m[2] ?? m[1]])
  }
  return out
}

function addImportedName(names: EventBusNames, imported: string, local: string): void {
  if (imported === 'amagiEvents') names.global.add(local)
  else if (CLIENT_FACTORY_NAMES.includes(imported)) names.factory.add(local)
}

function collectBusNames(code: string): EventBusNames {
  const names: EventBusNames = { global: new Set(), instance: new Set(), factory: new Set() }

  for (const m of code.matchAll(AMAGI_DEFAULT_IMPORT_RE)) {
    // 默认导入名同时进两张名单：`amagi.on(...)` 是静态的全局单例，
    // `amagi({...}).on(...)` 才是实例总线 —— classifyReceiver 靠「有没有被调用」分开
    names.global.add(m[1])
    names.factory.add(m[1])
    for (const [imported, local] of parseSpecifiers(m[2] ?? '')) addImportedName(names, imported, local)
  }
  for (const m of code.matchAll(AMAGI_NAMED_IMPORT_RE)) {
    for (const [imported, local] of parseSpecifiers(m[1])) addImportedName(names, imported, local)
  }
  // 赋值语句反复扫到不再增长：`const bus = client.events` 可能引另一个别名
  for (let round = 0; round < 3; round++) {
    const before = names.instance.size + names.global.size
    for (const m of code.matchAll(CLIENT_ASSIGN_RE)) {
      if (names.factory.has(m[2])) names.instance.add(m[1])
    }
    for (const m of code.matchAll(EVENTS_ALIAS_RE)) {
      if (names.instance.has(m[2])) names.instance.add(m[1])
      else if (names.global.has(m[2])) names.global.add(m[1])
    }
    if (names.instance.size + names.global.size === before) break
  }
  return names
}

/** 跳过一段字符串/模板字面量，返回收尾引号的下标；没闭合返回 -1 */
function skipQuoted(code: string, start: number): number {
  const quote = code[start]
  for (let i = start + 1; i < code.length; i++) {
    if (code[i] === '\\') {
      i += 1
      continue
    }
    if (code[i] === quote) return i
  }
  return -1
}

/**
 * 从 `(` 找配对的 `)`，跳过注释与字符串。
 *
 * 模板字面量**整段跳过**：里头 `${...}` 的括号必然成对，跳过不影响计数，
 * 而模板文本里落单的括号（`` `耗时(${d}ms` ``）反倒因此不会把计数带偏。
 */
function findCallEnd(code: string, open: number): number {
  let depth = 0
  for (let i = open; i < code.length; i++) {
    const c = code[i]
    // 注释先判：`// don't` 里那个引号不能当成字符串开头
    if (c === '/' && code[i + 1] === '/') {
      const nl = code.indexOf('\n', i)
      if (nl === -1) return -1
      i = nl
      continue
    }
    if (c === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2)
      if (end === -1) return -1
      i = end + 1
      continue
    }
    if (c === '\'' || c === '"' || c === '`') {
      const end = skipQuoted(code, i)
      if (end === -1) return -1
      i = end
      continue
    }
    if (c === '(') depth += 1
    else if (c === ')') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

/** 从 `)` 往左找配对的 `(`（不认字符串：receiver 的实参里出现落单括号是已知边界） */
function matchParenLeft(code: string, close: number): number {
  let depth = 0
  for (let i = close; i >= 0; i--) {
    if (code[i] === ')') depth += 1
    else if (code[i] === '(') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

/** receiver 属性链的一段；`call` 表示这一段后面跟着实参括号 */
interface ReceiverSegment {
  name: string
  call: boolean
}

/**
 * 从 `.on(` 的那个点往左读 receiver 表达式，切成属性链（左→右）。
 *
 * `amagi({ ... }).events` → `[{ amagi, call: true }, { events }]`。
 * 读不动（下标访问、字面量开头等）返回 null，交给 classifyReceiver 判成 unknown。
 */
function scanReceiver(code: string, dotIndex: number): ReceiverSegment[] | null {
  const segs: ReceiverSegment[] = []
  let i = dotIndex - 1
  const skipSpaceLeft = (): void => {
    while (i >= 0 && /\s/.test(code[i])) i -= 1
  }
  for (;;) {
    skipSpaceLeft()
    if (i >= 0 && code[i] === '?') i -= 1 // 可选链 `client?.events?.on(...)`
    skipSpaceLeft()
    let call = false
    if (i >= 0 && code[i] === ')') {
      const open = matchParenLeft(code, i)
      if (open === -1) return null
      i = open - 1
      call = true
      skipSpaceLeft()
    }
    const end = i + 1
    while (i >= 0 && /[\w$]/.test(code[i])) i -= 1
    const name = code.slice(i + 1, end)
    if (name === '' || /^\d/.test(name)) return null
    segs.unshift({ name, call })
    skipSpaceLeft()
    if (i >= 0 && code[i] === '.') {
      i -= 1
      continue
    }
    return segs
  }
}

type ReceiverKind = 'instance' | 'global' | 'unknown'

function classifyReceiver(segs: ReceiverSegment[] | null, names: EventBusNames): ReceiverKind {
  if (segs === null || segs.length === 0) return 'unknown'
  const chain = [...segs]
  // 链式注册 `x.on(...).on(...)`：尾部的 on/once 调用段不属于 receiver
  for (;;) {
    const tail = chain[chain.length - 1]
    if (chain.length > 1 && tail.call && (tail.name === 'on' || tail.name === 'once')) chain.pop()
    else break
  }
  const tail = chain[chain.length - 1]
  if (chain.length > 1 && !tail.call && tail.name === 'events') chain.pop()
  if (chain.length !== 1) return 'unknown' // `this.client.events` 这类链判不出来
  const head = chain[0]
  // 被调用过 → 只可能是工厂（`amagi({...})`）；没调用过的默认导入名是静态全局单例
  if (head.call) return names.factory.has(head.name) ? 'instance' : 'unknown'
  if (names.global.has(head.name)) return 'global'
  if (names.instance.has(head.name)) return 'instance'
  return 'unknown'
}

/**
 * 取监听器的负载形参名。
 *
 * - 返回名字：内联箭头 / 函数表达式，形参是普通标识符（带类型标注也行）
 * - 返回 `''`：监听器根本不收负载（`() => refresh()`），没什么可改也不该标 TODO
 * - 返回 null：具名函数引用、解构形参、rest 形参 —— 改不动，交回人工
 */
function listenerParam(region: string): string | null {
  const head = region.replace(/^\s*/, '')
  const paren = /^(?:async\s+)?(?:function\s*(?:[A-Za-z_$][\w$]*\s*)?)?\(/.exec(head)
  if (paren !== null) {
    const open = paren[0].length - 1
    const close = findCallEnd(head, open)
    if (close === -1) return null
    const params = head.slice(open + 1, close).trim()
    if (params === '') return ''
    const first = /^([A-Za-z_$][\w$]*)\s*(?::|,|$)/.exec(params)
    return first === null ? null : first[1]
  }
  const bare = /^(?:async\s+)?([A-Za-z_$][\w$]*)\s*=>/.exec(head)
  return bare === null ? null : bare[1]
}

/** 规则 9 的命中统计：count 是总命中数，四个布尔各对应一条 TODO 文案 */
interface EventStats {
  count: number
  endpointValue: boolean
  timestamp: boolean
  source: boolean
  manual: boolean
}

// 监听器注册：`.on('api:success',` / `.once('log:warn',`。第一个实参必须是
// **amagi 的事件名字面量**，所以别的库的 `emitter.on('data', ...)` 不会命中。
const LISTENER_CALL_RE = /\.\s*(?:on|once)\s*\(\s*(['"])([a-z]+:[a-z]+)\1\s*,/g

/** 在一个监听器实参区间内改写负载读法（区间里可能还嵌套着别的注册，先递归） */
function rewriteListenerRegion(region: string, param: string, names: EventBusNames, stats: EventStats): string {
  let text = rewriteEventPayloads(region, names, stats)
  const p = param.replace(/\$/g, '\\$')
  for (const [flat, nested] of PAYLOAD_READS) {
    // 前面不许是 `.` 或标识符字符：否则形参叫 `meta` 时，改出来的
    // `meta.meta.platform` 会在下一次运行里再被命中一层（不幂等）
    const re = new RegExp(`(?<![.\\w$])${p}(\\??\\.)${flat}\\b`, 'g')
    text = text.replace(re, (_m, op: string) => {
      stats.count += 1
      if (flat === 'methodType') stats.endpointValue = true
      return `${param}${op}${nested}`
    })
  }
  const stamps = [...text.matchAll(new RegExp(`(?<![.\\w$])${p}\\??\\.timestamp\\b`, 'g'))].length
  if (stamps > 0) {
    stats.count += stamps
    stats.timestamp = true
  }
  return text
}

/**
 * 扫全文的监听器注册，只改**实例总线**那些。
 *
 * 从左往右拼输出：真正改写过的区间会把 `last` 推到区间末尾，于是嵌套在里头的
 * 注册不会被外层再扫一遍（由 rewriteListenerRegion 递归处理）；跳过的区间
 * （全局单例 / 改不动）不推 `last`，所以挂在全局单例监听器**里**的实例总线注册
 * 照样能命中。
 */
function rewriteEventPayloads(code: string, names: EventBusNames, stats: EventStats): string {
  let out = ''
  let last = 0
  for (const m of code.matchAll(LISTENER_CALL_RE)) {
    const start = m.index
    if (start < last) continue
    if (!BUS_EVENT_NAMES.has(m[2])) continue
    const argsEnd = findCallEnd(code, start + m[0].indexOf('('))
    if (argsEnd === -1) continue
    const kind = classifyReceiver(scanReceiver(code, start), names)
    if (kind === 'global') continue // 顶层 amagiEvents：v6 形状一字未改，一个字都别动
    if (kind === 'unknown') {
      stats.count += 1
      stats.source = true
      continue
    }
    const bodyStart = start + m[0].length
    const region = code.slice(bodyStart, argsEnd)
    const param = listenerParam(region)
    if (param === null) {
      stats.count += 1
      stats.manual = true
      continue
    }
    if (param === '') continue // 监听器不收负载
    out += code.slice(last, bodyStart) + rewriteListenerRegion(region, param, names, stats)
    last = argsEnd
  }
  return out + code.slice(last)
}

// ---- 已注入 TODO(amagi-v7:) 行的保护（幂等的前提）----
//
// TODO 文案本身要引用 v6 字面量（`typeMode: 'loose'`、`r.error.code`）—— 不写清
// 删掉的是什么，人工项就无从下手。但规则是纯文本的，扫到这些注释行时：
// 规则 2 会把上一次注入的 `typeMode: 'loose'` 从注释里删掉，文案一变
// injectHeader 的去重就失效，于是再插一条新的 —— 连跑两次 TODO 既被改坏又翻倍。
// 所以先把这些整行换成哨符，规则只作用于其余文本，最后原位放回。
// 哨符是纯 ASCII 记号，任何规则的正则都不可能命中它。

const TODO_LINE_RE = /^[ \t]*\/\/ TODO\(amagi-v7\):.*$/gm

const sentinel = (i: number): string => `@@amagi-todo-${i}@@`

function maskTodoLines(text: string): { text: string; lines: string[] } {
  const lines: string[] = []
  const masked = text.replace(TODO_LINE_RE, (line) => {
    lines.push(line)
    return sentinel(lines.length - 1)
  })
  return { text: masked, lines }
}

function restoreTodoLines(text: string, lines: string[]): string {
  let out = text
  for (let i = 0; i < lines.length; i++) {
    // 函数式替换：文案里的 `$` 不被当成替换模式
    out = out.replace(sentinel(i), () => lines[i])
  }
  return out
}

// ---- 文件头 TODO 注入 ----
//
// `injected` 是**真正新写进文件**的那几条 —— 与「规则想注入的条数」不同：
// 重复运行时想注入的还是那几条，但文件里已经有了，一条都不会新增。
// 报告的 TODO 数字取这个值，否则第二次运行会声称又注入了几条。

function injectHeader(code: string, todos: string[]): { code: string; injected: string[] } {
  if (todos.length === 0) return { code, injected: [] }
  const eol = code.includes('\r\n') ? '\r\n' : '\n'
  const fresh: string[] = []
  for (const t of todos) {
    // 与文件已有内容去重（幂等：重复跑不叠加）
    if (!fresh.includes(t) && !code.includes(t)) fresh.push(t)
  }
  if (fresh.length === 0) return { code, injected: [] }
  return { code: fresh.join(eol) + eol + eol + code, injected: fresh }
}

// ---- 主入口：8 条规则按序执行 ----

export function transformSource(text: string): TransformResult {
  const changes: Change[] = []
  const header: string[] = []

  // 未命中的规则既不记 change 也不注入 TODO —— TODO 只跟随真实命中，
  // 否则每个文件都会被插一条无关的人工项（判据要求 TODO 可信）。
  const record = (rule: RuleName, count: number, todos: string[] = []): void => {
    if (count <= 0) return
    for (const t of todos) {
      if (!header.includes(t)) header.push(t)
    }
    changes.push({ rule, count, ...(todos.length > 0 ? { todos } : {}) })
  }

  // 上一次运行注入的 TODO 行先抠成哨符，规则不作用于它们（见 maskTodoLines）
  const masked = maskTodoLines(text)
  let code = masked.text

  // 1. typeMode: 'strict' 整键删除
  const strict = removeTypeModeKey(code, 'strict')
  code = strict.text
  record('typeMode-strict', strict.removed)

  // 2. typeMode: 'loose' 整键删除 + TODO
  const loose = removeTypeModeKey(code, 'loose')
  code = loose.text
  record('typeMode-loose', loose.removed, [TODO_LOOSE])

  // 3. r.error.amagiError.errorDescription → r.error.message
  const amagi = replaceErrorReads(code, 'amagiError')
  code = amagi.text
  record('error-amagiError', amagi.count)

  // 4. r.error.errorDescription → r.error.message（第 3 步已把 amagiError 链变成
  //    .message，不会二次命中）
  const plain = replaceErrorReads(code, 'plain')
  code = plain.text
  record('error-errorDescription', plain.count)

  // 5. registerXxxRoutes( → createXxxRoutes(
  let routeCount = 0
  code = code.replace(REGISTER_ROUTES_RE, (_m, platform: string) => {
    routeCount += 1
    return `create${platform}Routes(`
  })
  record('register-routes', routeCount)

  // 6. import 里删除 XxxApiRoutes + TODO
  const routesImport = removeApiRouteImports(code)
  code = routesImport.text
  record(
    'api-routes-import',
    routesImport.removed,
    routesImport.names.map((name) => TODO_API_ROUTES(name))
  )

  // 7. r.code 读法 → TODO（不删码，每个文件一次）
  const rCodeCount = [...code.matchAll(R_CODE_RE)].length
  record('r-code-read', rCodeCount, rCodeCount > 0 ? [TODO_R_CODE] : [])

  // 8. try/catch 校验错误处理 → TODO（每个文件一次）
  if (hasValidationCatch(code)) record('validation-catch', 1, [TODO_VALIDATION])

  // 9. 实例总线监听器的负载读法进 meta（顶层 amagiEvents 的负载一字未改，跳过）
  const stats: EventStats = { count: 0, endpointValue: false, timestamp: false, source: false, manual: false }
  code = rewriteEventPayloads(code, collectBusNames(code), stats)
  const eventTodos: string[] = []
  if (stats.endpointValue) eventTodos.push(TODO_EVENT_ENDPOINT)
  if (stats.timestamp) eventTodos.push(TODO_EVENT_TIMESTAMP)
  if (stats.source) eventTodos.push(TODO_EVENT_SOURCE)
  if (stats.manual) eventTodos.push(TODO_EVENT_MANUAL)
  record('events-payload-meta', stats.count, eventTodos)

  // 哨符原位放回，再按需追加本轮新增的 TODO（injectHeader 与放回的原文去重）
  const injected = injectHeader(restoreTodoLines(code, masked.lines), header)
  return { code: injected.code, changes, injected: injected.injected }
}

export interface TransformFileResult {
  code: string
  changed: boolean
  changes: Change[]
  injected: string[]
}

export function transformFile(source: string): TransformFileResult {
  const r = transformSource(source)
  return { code: r.code, changed: r.code !== source, changes: r.changes, injected: r.injected }
}
