// v6 → v7 迁移变换 —— 06-migration「codemod」节逐条实现（纯文本启发式，不解析 AST）。
//
// 顺序执行的 8 条规则（对每个文件）：
//   1. typeMode-strict        删 `typeMode: 'strict'`（现在是默认行为）
//   2. typeMode-loose         删 `typeMode: 'loose'`，文件头注入一条 TODO
//   3. error-amagiError       r.error.amagiError.errorDescription → r.error.message
//   4. error-errorDescription r.error.errorDescription → r.error.message
//   5. register-routes        registerXxxRoutes( → createXxxRoutes(
//   6. api-routes-import      从 import 语句删除 XxxApiRoutes 具名导入，文件头注入 TODO
//   7. r-code-read            r.code 读法：不删码，文件头注入一条 TODO
//   8. validation-catch       catch 块内含校验错误字样的文件：文件头注入一条 TODO
//
// 规则跑之前先把已有的 `// TODO(amagi-v7):` 行换成哨符（maskTodoLines）——
// 这些文案本身引用 v6 字面量，不屏蔽的话第二次运行会把它们改坏。**幂等的前提。**
//
// 已知边界（不在规则内，留给人工）：
//   - `import { registerXxxRoutes } from ...` 具名导入本身不重写（规则只处理
//     括号调用形式 registerXxxRoutes(...)）
//   - `export { XxxApiRoutes } from ...` 再导出语句不在规则 6 内

export type RuleName =
  | 'typeMode-strict'
  | 'typeMode-loose'
  | 'error-amagiError'
  | 'error-errorDescription'
  | 'register-routes'
  | 'api-routes-import'
  | 'r-code-read'
  | 'validation-catch'

export interface Change {
  /** 由 runCodemod 聚合到文件级报告时携带的相对路径 */
  file?: string
  rule: RuleName
  /** 文本替换/删除的命中次数（r-code-read 为读法命中数，不删码） */
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
