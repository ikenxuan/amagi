/**
 * 从 `packages/core` 的公开导出面抽出一棵 API 模型树，交给 `generate-api-types.ts` 渲染成 MDX。
 *
 * ## 为什么自己抽，而不用 TypeDoc
 *
 * TypeDoc 只吃 TypeScript 6 的 **JS 编译器 API**（`import ts from 'typescript'` 之后
 * `createProgram` / `convert` / `generateJson`）。TS7 的包入口只剩 `lib/version.cjs`
 * （只导出 `version` 与 `versionMajorMinor`，`createProgram` 是 `undefined`），
 * 而 TypeDoc 的 peer 范围停在 `5.0.x || … || 6.0.x`，没有支持 TS7 的版本 ——
 * 实测它在 TS7 下连 `import` 都会炸。这里改用 TS7 的原生接口
 * `typescript/unstable/sync`，整个仓库就不必为了文档站留一份 TS6。
 *
 * ## 为什么产出仍然是 TypeDoc 的 JSON 形状
 *
 * `generate-api-types.ts` 的渲染部分（700 行）是照着 TypeDoc 的 `schemaVersion 2.0`
 * 写的，里面全是排版上的取舍：截断档位、`{@link}` 解析、表格转义、分页规则。
 * 换形状等于把那部分重写一遍。所以这里只替换**上游** —— 字段名、`kind` 的数值、
 * `flags` 的键名都保持 TypeDoc 的约定，渲染器一行都不用改。
 *
 * ## 与 TypeDoc 对齐的判据（全部对着 413 个符号的产物实测过，不是照文档猜的）
 *
 * - **变量 vs 函数**：TypeDoc 看的是**声明怎么写**，不是类型的形状。
 *   `export const f = () => {}`（无类型标注 + 箭头初始化）→ `Function`；
 *   `export const f: typeof g = g`（有类型标注）→ `Variable`。只看「类型有没有调用签名」
 *   会把 `CreateApp as AmagiConstructor`、`amagi: typeof Client` 这类一起判成函数 ——
 *   实测 4 个错位。
 * - **类型专用的类导出**：`export type { EventBus }` 里的类，TypeDoc 按 `Interface` 出。
 *   这对读者也更准：公开面上 `new` 不了它（实测 1 个，不处理就落到「类」页）。
 * - **函数的 JSDoc 挂在签名上**，不在声明上 —— 渲染器读的是
 *   `reflection.comment ?? reflection.signatures[0].comment`，而索引页只读前者，
 *   所以函数的索引页摘要**本来就该是空的**（黄金产物实测如此）。挂在声明上会让
 *   索引页凭空多出 48 条摘要。
 * - **`{@link}` 必须从源码文本里读**：TS 的 `getDocumentationCommentOfSymbol()`
 *   会把链接吃掉（只剩标签文本，实测 0 个符号还留着 `{@link`），147 处链接会静默
 *   退化成纯文本。这里一律走 `readJsDoc()` 自己解析。
 *
 * ## 类型为什么走语法树而不是语义类型
 *
 * `type X = Foo` 在文档里就该显示成 `Foo`，不是展开后的形状（黄金产物实测如此）。
 * 语义类型（`checker.getDeclaredTypeOfSymbol`）会把别名展开，所以类型文本尽量取自
 * 声明上的 **TypeNode**；只有拿不到 TypeNode 时才回退到语义类型。
 */

import { readFileSync } from 'node:fs'
import { relative, sep } from 'node:path'

import { SyntaxKind, type Node } from 'typescript/unstable/ast'
import { API, SymbolFlags, type Checker, type Project, type Symbol as TsSymbol } from 'typescript/unstable/sync'

// ─────────────────────────────── 形状（沿用 TypeDoc 的 JSON schema） ───────────────────────────────

/** 注释里的一段（text / code / inline-tag） */
export interface CommentPart {
  kind: string
  text?: string
  tag?: string
  target?: number | string
}

export interface CommentBlock {
  tag: string
  content?: CommentPart[]
}

export interface Comment {
  summary?: CommentPart[]
  blockTags?: CommentBlock[]
  modifierTags?: string[]
}

export interface Source {
  fileName: string
  line: number
  url?: string
}

export interface TypeDocType {
  type: string
  name?: string
  value?: unknown
  elementType?: TypeDocType
  element?: TypeDocType
  isOptional?: boolean
  elements?: TypeDocType[]
  types?: TypeDocType[]
  typeArguments?: TypeDocType[]
  objectType?: TypeDocType
  indexType?: TypeDocType
  queryType?: TypeDocType
  operator?: string
  target?: TypeDocType
  head?: string
  tail?: [TypeDocType, string][]
  declaration?: Reflection
  checkType?: TypeDocType
  extendsType?: TypeDocType
  trueType?: TypeDocType
  falseType?: TypeDocType
  parameterType?: TypeDocType
  templateType?: TypeDocType
  parameter?: string
  optionalModifier?: string
  asserts?: boolean
  targetType?: TypeDocType
  qualifiedName?: string
}

export interface Reflection {
  id: number
  name: string
  kind: number
  flags?: Record<string, boolean>
  comment?: Comment
  sources?: Source[]
  type?: TypeDocType
  typeParameters?: Reflection[]
  signatures?: Reflection[]
  parameters?: Reflection[]
  children?: Reflection[]
  indexSignatures?: Reflection[]
  defaultValue?: string
}

export interface ProjectJson {
  name: string
  children: Reflection[]
}

/** TypeDoc 的 `ReflectionKind` 数值。渲染器整篇按这些常量分支，所以逐字保留 */
export const ReflectionKind = {
  Namespace: 4,
  Enum: 8,
  EnumMember: 16,
  Variable: 32,
  Function: 64,
  Class: 128,
  Interface: 256,
  Constructor: 512,
  Property: 1024,
  Method: 2048,
  CallSignature: 4096,
  IndexSignature: 8192,
  ConstructorSignature: 16384,
  Parameter: 32768,
  TypeLiteral: 65536,
  TypeParameter: 131072,
  Accessor: 262144,
  TypeAlias: 2097152
} as const

// ─────────────────────────────── JSDoc ───────────────────────────────

/** 声明紧邻的那段块注释原文，以及它起始的行号（1 起） */
interface RawJsDoc {
  file: string
  line: number
  text: string
}

/**
 * 变量声明的 JSDoc 挂在**语句**上，不在 `VariableDeclaration` 上。
 *
 * `export const x = …` 里 `VariableDeclaration.getStart()` 指向 `x`（前面隔着
 * `export const `），所以要从这里往上走两级才会碰到紧邻注释的那一层。
 * 只对这两种 kind 放行是刻意的：无节制地往上找，会把**上一个语句**的注释认领过来。
 */
const JSDOC_WRAPPERS = new Set<number>([SyntaxKind.VariableDeclaration, SyntaxKind.VariableDeclarationList])

/** 块注释紧邻判定：从 `start` 往前跳过空白，必须正好停在注释的结束标记上 */
const readJsDoc = (node: Node | undefined, textOf: (file: string) => string): RawJsDoc | undefined => {
  let current: Node | undefined = node
  for (let depth = 0; depth < 4 && current; depth++) {
    // 合成节点（`checker.typeToTypeNode()` 造出来的那些）**没有源位置**：
    // 读 `getSourceFile()` 会以 `Offset is outside the bounds of the DataView` 炸掉。
    // 这类节点本来也不可能有 JSDoc
    let file: string | undefined
    let start = -1
    try {
      file = current.getSourceFile()?.fileName
      start = current.getStart()
    } catch {
      return undefined
    }
    const text = file ? textOf(file) : ''
    if (text !== '' && start >= 0) {
      let i = start - 1
      while (i >= 0 && /\s/.test(text[i])) i--
      if (i >= 1 && text[i] === '/' && text[i - 1] === '*') {
        const open = text.lastIndexOf('/**', i - 1)
        if (open >= 0) return { file, line: text.slice(0, open).split(/\r?\n/).length, text: text.slice(open, i + 1) }
      }
    }
    if (!JSDOC_WRAPPERS.has(current.kind)) return undefined
    current = current.parent
  }
  return undefined
}

/** 块注释原文 → 每行去掉 `* ` 前缀，再剥掉首尾空行 */
const stripJsDoc = (raw: string): string[] =>
  raw
    .replace(/^\/\*\*?/, '')
    .replace(/\*\/$/, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*? ?/, '').replace(/\s+$/, ''))
    .filter((line, index, all) => !(line === '' && (index === 0 || index === all.length - 1)))

interface RawBlock {
  tag: string
  body: string
}

/** 摘要与块标记分开：`@tag` 开头的行起一个新块，其余接在当前块后面 */
const splitJsDoc = (lines: string[]): { summary: string; blocks: RawBlock[] } => {
  const blocks: RawBlock[] = []
  const summary: string[] = []
  for (const line of lines) {
    const match = /^@(\w+)\s?(.*)$/.exec(line)
    if (match) blocks.push({ tag: `@${match[1]}`, body: match[2] })
    else if (blocks.length > 0) blocks[blocks.length - 1].body += `\n${line}`
    else summary.push(line)
  }
  return { summary: summary.join('\n').trim(), blocks: blocks.map((block) => ({ tag: block.tag, body: block.body.trim() })) }
}

/** `import("../x").Foo` 这种限定前缀的首尾记号（见 print） */
const OPEN_IMPORT = 'import("'
const CLOSE_IMPORT = '").'

/** 解析链接目标：顶层导出给站内 id，外链给 URL 字符串，都不是则 undefined（渲染器退化成纯文本） */
type LinkTarget = (name: string) => number | string | undefined

/**
 * 一段注释文本 → 片段数组。
 *
 * 片段种类与 TypeDoc 对齐（渲染器按它们分支）：
 * - 围栏代码块整段（含围栏本身），或行内代码（**含反引号**）→ `code`
 * - `{@link X}` → `inline-tag`，`target` 是站内 id（只有顶层导出有）或外链 URL
 * - 其余 → `text`
 */
const toParts = (text: string, linkTarget: LinkTarget): CommentPart[] => {
  const parts: CommentPart[] = []
  let buffer = ''
  const flush = (): void => {
    if (buffer !== '') parts.push({ kind: 'text', text: buffer })
    buffer = ''
  }

  for (let i = 0; i < text.length;) {
    // 围栏代码块：整段（含围栏）作为一个 code 片段 —— 渲染器会把语言统一改成 ts
    if (text.startsWith('```', i) && (i === 0 || text[i - 1] === '\n')) {
      const close = text.indexOf('\n```', i)
      const end = close < 0 ? text.length : close + 4
      flush()
      parts.push({ kind: 'code', text: text.slice(i, end) })
      i = end
      continue
    }
    if (text[i] === '`') {
      const close = text.indexOf('`', i + 1)
      if (close > i) {
        flush()
        // **连反引号一起留着** —— 渲染器靠片段文本里有没有反引号决定要不要再包一层
        parts.push({ kind: 'code', text: text.slice(i, close + 1) })
        i = close + 1
        continue
      }
    }
    if (text.startsWith('{@link', i)) {
      const close = text.indexOf('}', i)
      if (close > i) {
        const body = text.slice(i + 6, close).trim()
        // `{@link Target}` / `{@link Target|label}` / `{@link Target label}` 三种写法
        const [target, ...rest] = body.split(/\||\s+/)
        const label = rest.join(' ').trim() || target
        flush()
        parts.push({ kind: 'inline-tag', tag: '@link', text: label, target: linkTarget(target) })
        i = close + 1
        continue
      }
    }
    buffer += text[i]
    i++
  }
  flush()
  return parts
}

/** 注释原文 → `Comment`。`@param` 不在这里 —— 它要挂到参数 reflection 上（见 paramDocs） */
const buildComment = (jsdoc: RawJsDoc | undefined, linkTarget: LinkTarget): Comment | undefined => {
  if (!jsdoc) return undefined
  const { summary, blocks } = splitJsDoc(stripJsDoc(jsdoc.text))
  const comment: Comment = {}
  if (summary !== '') comment.summary = toParts(summary, linkTarget)
  const blockTags = blocks
    .filter((block) => block.tag !== '@param')
    .map((block) => ({ tag: block.tag, content: toParts(block.body, linkTarget) }))
  if (blockTags.length > 0) comment.blockTags = blockTags
  return comment.summary || comment.blockTags ? comment : undefined
}

/**
 * `@param name - 说明` → 说明。
 *
 * 带点的写法（`@param options.token`）指向嵌套字段，只取第一段挂到顶层参数上 ——
 * 渲染器的参数表是按顶层参数列行的。
 */
const paramDocs = (jsdoc: RawJsDoc | undefined, linkTarget: LinkTarget): Map<string, Comment> => {
  const docs = new Map<string, Comment>()
  if (!jsdoc) return docs
  for (const block of splitJsDoc(stripJsDoc(jsdoc.text)).blocks) {
    if (block.tag !== '@param') continue
    const match = /^(\S+)\s*(?:-\s*)?([\s\S]*)$/.exec(block.body)
    if (!match) continue
    const name = match[1].split('.')[0]
    const text = match[2].trim()
    if (!docs.has(name)) docs.set(name, { summary: text === '' ? [] : toParts(text, linkTarget) })
  }
  return docs
}

// ─────────────────────────────── 抽取上下文 ───────────────────────────────

interface Context {
  checker: Checker
  project: Project
  /** 声明所在文件 → 源码文本（读盘缓存，`readJsDoc` 靠它做反向扫描） */
  textOf: (file: string) => string
  /** 顶层导出名 → 站内 id。`{@link}` 只能连到公开面上有的东西 */
  linkTarget: LinkTarget
  /** core 包根，`sources[].fileName` 是相对它的路径 */
  coreRoot: string
  /** `sources[].url` 的前缀（GitHub blob 地址） */
  repoUrl: string
  /** 打印任意节点为源码文本 */
  print: (node: Node | undefined) => string
  nextId: () => number
}

/** 声明节点 → `sources`。包外（`../response-types/dist/…`）不给链接，与 TypeDoc 一致 */
const sourcesOf = (ctx: Context, node: Node | undefined): Source[] | undefined => {
  if (!node) return undefined
  // 合成节点没有源位置（见 readJsDoc），拿不到就不给 source
  let file: string
  let start: number
  try {
    file = node.getSourceFile().fileName
    start = node.getStart()
  } catch {
    return undefined
  }
  if (start < 0) return undefined
  const fileName = relative(ctx.coreRoot, file).split(sep).join('/')
  const line = ctx.textOf(file).slice(0, start).split(/\r?\n/).length
  // 只给包内文件挂链接 —— 包外那份是 `pnpm gen:types` 生成的，git 里没有
  if (fileName.startsWith('..')) return [{ fileName, line }]
  return [{ fileName, line, url: `${ctx.repoUrl}/${fileName}#L${line}` }]
}

/** 名字节点 → 文本。字符串/数字字面量取**不带引号**的原值（渲染器会自己补引号） */
const nameOf = (ctx: Context, node: Node | undefined): string => {
  if (!node) return ''
  const kind = node.kind
  if (kind === SyntaxKind.StringLiteral || kind === SyntaxKind.NumericLiteral || kind === SyntaxKind.Identifier)
    return (node as unknown as { text: string }).text
  return ctx.print(node)
}

// ─────────────────────────────── 类型 ───────────────────────────────

/**
 * 兜底：把节点原样打印成一段文本。
 *
 * 借用 `intrinsic` 分支是**有意的** —— 渲染器对它的处理就是 `return type.name`，
 * 于是这里多认一种不认识的类型节点时，渲染器一行都不用改。代价是这种文本不参与
 * 「逐档收窄」的截断（`fitText` 对它是三档同文），过长时会被硬截。
 */
const rawType = (ctx: Context, node: Node): TypeDocType => ({ type: 'intrinsic', name: ctx.print(node) })

/** `keyof T` / `readonly T` / `unique symbol` 这类前缀算符的文本 */
const OPERATOR_TEXT: Record<number, string> = {
  [SyntaxKind.KeyOfKeyword]: 'keyof',
  [SyntaxKind.ReadonlyKeyword]: 'readonly',
  [SyntaxKind.UniqueKeyword]: 'unique'
}

/** 类型节点 → `TypeDocType`。渲染器的 `typeToText` 按这些 `type` 值分支 */
const convertType = (ctx: Context, node: Node | undefined, depth = 0): TypeDocType | undefined => {
  if (!node || depth > 12) return undefined
  const kids = (list: readonly Node[] | undefined): TypeDocType[] =>
    (list ?? []).map((one) => convertType(ctx, one, depth + 1)).filter((one): one is TypeDocType => one !== undefined)
  const any = node as unknown as Record<string, unknown>
  const child = (key: string): Node | undefined => any[key] as Node | undefined

  switch (node.kind) {
    case SyntaxKind.TypeReference: {
      const typeArguments = kids(any.typeArguments as readonly Node[] | undefined)
      return { type: 'reference', name: ctx.print(child('typeName')), ...(typeArguments.length > 0 ? { typeArguments } : {}) }
    }
    case SyntaxKind.UnionType:
      return { type: 'union', types: kids(any.types as readonly Node[]) }
    case SyntaxKind.IntersectionType:
      return { type: 'intersection', types: kids(any.types as readonly Node[]) }
    case SyntaxKind.ArrayType:
      return { type: 'array', elementType: convertType(ctx, child('elementType'), depth + 1) }
    case SyntaxKind.TupleType:
      return { type: 'tuple', elements: kids(any.elements as readonly Node[]) }
    case SyntaxKind.NamedTupleMember:
      return {
        type: 'namedTupleMember',
        name: nameOf(ctx, child('name')),
        isOptional: child('questionToken') !== undefined,
        element: convertType(ctx, child('type'), depth + 1)
      }
    case SyntaxKind.OptionalType:
      return { type: 'optional', elementType: convertType(ctx, child('type'), depth + 1) }
    case SyntaxKind.RestType:
      return { type: 'rest', elementType: convertType(ctx, child('type'), depth + 1) }
    case SyntaxKind.ParenthesizedType:
      return convertType(ctx, child('type'), depth)
    case SyntaxKind.LiteralType: {
      const literal = child('literal')
      if (literal && (literal.kind === SyntaxKind.StringLiteral || literal.kind === SyntaxKind.NumericLiteral))
        return { type: 'literal', value: (literal as unknown as { text: string }).text }
      // `true` / `false` / `null` 在 TypeDoc 里是 intrinsic，不是 literal
      return { type: 'intrinsic', name: ctx.print(literal) }
    }
    case SyntaxKind.TypeOperator: {
      const target = convertType(ctx, child('type'), depth + 1)
      return { type: 'typeOperator', operator: OPERATOR_TEXT[any.operator as number] ?? 'keyof', ...(target ? { target } : {}) }
    }
    case SyntaxKind.IndexedAccessType:
      return {
        type: 'indexedAccess',
        objectType: convertType(ctx, child('objectType'), depth + 1),
        indexType: convertType(ctx, child('indexType'), depth + 1)
      }
    case SyntaxKind.ConditionalType:
      return {
        type: 'conditional',
        checkType: convertType(ctx, child('checkType'), depth + 1),
        extendsType: convertType(ctx, child('extendsType'), depth + 1),
        trueType: convertType(ctx, child('trueType'), depth + 1),
        falseType: convertType(ctx, child('falseType'), depth + 1)
      }
    case SyntaxKind.MappedType:
      return {
        type: 'mapped',
        parameter: nameOf(ctx, (child('typeParameter') as unknown as Record<string, unknown> | undefined)?.name as Node | undefined),
        parameterType: convertType(
          ctx,
          (child('typeParameter') as unknown as Record<string, unknown> | undefined)?.constraint as Node | undefined,
          depth + 1
        ),
        templateType: convertType(ctx, child('type'), depth + 1),
        optionalModifier: child('questionToken') !== undefined ? '+' : ''
      }
    case SyntaxKind.TemplateLiteralType: {
      // head 与每段的 literal 都是 TemplateHead / TemplateMiddle / TemplateTail **记号**，
      // 字面内容在它们的 .text 上。交给打印器会打出残骸 —— 实测 BV1 那个模板字面量
      // 的返回类型渲染成了只剩一个右花括号加插值
      const head = (any.head as { text?: string } | undefined)?.text ?? ''
      const tail: [TypeDocType, string][] = []
      for (const span of (any.templateSpans as readonly Node[] | undefined) ?? []) {
        const record = span as unknown as Record<string, unknown>
        const inner = convertType(ctx, record.type as Node | undefined, depth + 1)
        if (inner) tail.push([inner, (record.literal as { text?: string } | undefined)?.text ?? ''])
      }
      return { type: 'templateLiteral', head, tail }
    }
    case SyntaxKind.TypeQuery:
      return { type: 'query', queryType: { type: 'reference', name: ctx.print(child('exprName')) } }
    case SyntaxKind.ThisType:
      return { type: 'intrinsic', name: 'this' }
    case SyntaxKind.TypePredicate:
      return {
        type: 'predicate',
        name: nameOf(ctx, child('parameterName')),
        asserts: any.assertsModifier !== undefined,
        ...(child('type') ? { targetType: convertType(ctx, child('type'), depth + 1) } : {})
      }
    case SyntaxKind.FunctionType:
    case SyntaxKind.ConstructorType: {
      // 名字用 `__type` —— TypeDoc 对匿名函数类型就是这么命名的，渲染出的签名叫法要一致
      const signature = convertSignature(ctx, '__type', node, depth)
      return {
        type: 'reflection',
        declaration: { id: ctx.nextId(), name: '__type', kind: ReflectionKind.CallSignature, signatures: [signature] }
      }
    }
    case SyntaxKind.TypeLiteral:
      return { type: 'reflection', declaration: convertMembers(ctx, node, ReflectionKind.TypeLiteral, depth) }
    default:
      return rawType(ctx, node)
  }
}

// ─────────────────────────────── 签名与成员 ───────────────────────────────

/**
 * 一个签名（函数声明、方法、箭头函数类型、类型字面量里的调用签名）。
 *
 * 类型参数与参数都取自**语法节点**：`signatureText` 要的是源码里写的那份形状。
 */
const convertSignature = (ctx: Context, name: string, node: Node, depth: number, docNode?: Node): Reflection => {
  const any = node as unknown as Record<string, unknown>
  // 签名节点与 JSDoc 所在节点**可能不是同一个**：`export const f = () => {}` 的
  // 参数在 initializer 上，注释却挂在语句上（见 JSDOC_WRAPPERS）
  const jsdoc = readJsDoc(docNode ?? node, ctx.textOf)
  const docs = paramDocs(jsdoc, ctx.linkTarget)
  const parameters = ((any.parameters as readonly Node[] | undefined) ?? []).map((parameter) => {
    const record = parameter as unknown as Record<string, unknown>
    const parameterName = nameOf(ctx, record.name as Node | undefined)
    return {
      id: ctx.nextId(),
      name: parameterName,
      kind: ReflectionKind.Parameter,
      // **有默认值不算可选** —— TypeDoc 只把 `?` 记成 isOptional，默认值只落 defaultValue。
      // 混在一起会让 `createClient(options?: ClientOptions)` 这种签名多出一个问号
      // （源码写的是 `options: ClientOptions = {}`），实测 3 处
      flags: { isOptional: record.questionToken !== undefined, isRest: record.dotDotDotToken !== undefined },
      type: convertType(ctx, record.type as Node | undefined, depth + 1),
      ...(record.initializer ? { defaultValue: ctx.print(record.initializer as Node) } : {}),
      ...(docs.has(parameterName) ? { comment: docs.get(parameterName) } : {})
    } satisfies Reflection
  })

  const typeParameters = ((any.typeParameters as readonly Node[] | undefined) ?? []).map((parameter) => {
    const record = parameter as unknown as Record<string, unknown>
    return {
      id: ctx.nextId(),
      name: nameOf(ctx, record.name as Node | undefined),
      kind: ReflectionKind.TypeParameter,
      ...(record.constraint ? { type: convertType(ctx, record.constraint as Node, depth + 1) } : {})
    } satisfies Reflection
  })

  return {
    id: ctx.nextId(),
    name,
    kind: ReflectionKind.CallSignature,
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(typeParameters.length > 0 ? { typeParameters } : {}),
    type: convertType(ctx, any.type as Node | undefined, depth + 1) ?? semanticReturnType(ctx, node, depth),
    ...(buildComment(jsdoc, ctx.linkTarget) ? { comment: buildComment(jsdoc, ctx.linkTarget) } : {})
  }
}

/**
 * 没有返回类型标注时的兜底（`const f = () => …` 这种推断返回）。
 *
 * 不回退的话一律渲染成 `void` —— 实测 `bv2av`/`av2bv`/`createClient`/`qtparam`
 * 四个函数的返回类型会整条消失，而它们是页面上最该看的东西。
 * 先走 `typeToTypeNode` 拿回语法节点（这样后续的结构化转换与显式标注一视同仁），
 * 拿不到才退化成一段纯文本。
 */
const semanticReturnType = (ctx: Context, node: Node, depth: number): TypeDocType => {
  const signature = ctx.checker.getSignatureFromDeclaration(node)
  const type = signature ? ctx.checker.getReturnTypeOfSignature(signature) : undefined
  if (!type) return { type: 'intrinsic', name: 'void' }
  // NoTruncation 不能省：默认的节点构造器会把成员多的对象类型写成 TS 内部记号
  // （形如三个点加 N more），实测直接漏进了 createClient 的返回类型
  const typeNode = ctx.checker.typeToTypeNode(type, node, 1)
  return (typeNode ? convertType(ctx, typeNode, depth + 1) : undefined) ?? { type: 'intrinsic', name: ctx.checker.typeToString(type) }
}

/** 类型字面量 / 接口 / 类的成员 → `children` + 索引签名 */
const convertMembers = (ctx: Context, node: Node, kind: number, depth: number): Reflection => {
  const any = node as unknown as Record<string, unknown>
  const members = (any.members as readonly Node[] | undefined) ?? []
  const children: Reflection[] = []
  const indexSignatures: Reflection[] = []

  for (const member of members) {
    const record = member as unknown as Record<string, unknown>
    if (member.kind === SyntaxKind.IndexSignature) {
      const parameters = ((record.parameters as readonly Node[] | undefined) ?? []).map((parameter) => {
        const inner = parameter as unknown as Record<string, unknown>
        return {
          id: ctx.nextId(),
          name: nameOf(ctx, inner.name as Node | undefined),
          kind: ReflectionKind.Parameter,
          type: convertType(ctx, inner.type as Node | undefined, depth + 1)
        } satisfies Reflection
      })
      indexSignatures.push({
        id: ctx.nextId(),
        name: '__index',
        kind: ReflectionKind.IndexSignature,
        parameters,
        type: convertType(ctx, record.type as Node | undefined, depth + 1)
      })
      continue
    }
    if (member.kind === SyntaxKind.CallSignature || member.kind === SyntaxKind.ConstructSignature) {
      children.push({
        id: ctx.nextId(),
        name: member.kind === SyntaxKind.CallSignature ? '__call' : '__new',
        kind: member.kind === SyntaxKind.CallSignature ? ReflectionKind.CallSignature : ReflectionKind.ConstructorSignature,
        signatures: [convertSignature(ctx, '__call', member, depth)]
      })
      continue
    }
    if (member.kind === SyntaxKind.EnumMember) {
      const initializer = record.initializer as Node | undefined
      children.push({
        id: ctx.nextId(),
        name: nameOf(ctx, record.name as Node | undefined),
        kind: ReflectionKind.EnumMember,
        ...(initializer
          ? {
              type: {
                type: 'literal',
                value:
                  initializer.kind === SyntaxKind.NumericLiteral
                    ? Number((initializer as unknown as { text: string }).text)
                    : ctx.print(initializer).replace(/^['"]|['"]$/g, '')
              }
            }
          : {}),
        ...(initializer ? { defaultValue: ctx.print(initializer) } : {}),
        ...(buildComment(readJsDoc(member, ctx.textOf), ctx.linkTarget)
          ? { comment: buildComment(readJsDoc(member, ctx.textOf), ctx.linkTarget) }
          : {})
      })
      continue
    }

    const isMethod = member.kind === SyntaxKind.MethodSignature || member.kind === SyntaxKind.MethodDeclaration
    const isAccessor = member.kind === SyntaxKind.GetAccessor || member.kind === SyntaxKind.SetAccessor
    const memberKind = isMethod || isAccessor ? ReflectionKind.Method : ReflectionKind.Property
    const jsdoc = readJsDoc(member, ctx.textOf)
    const modifiers = ((record.modifiers as readonly Node[] | undefined) ?? []).map((modifier) => modifier.kind)
    const memberReflection: Reflection = {
      id: ctx.nextId(),
      name: nameOf(ctx, record.name as Node | undefined),
      kind: memberKind,
      flags: {
        isOptional: record.questionToken !== undefined,
        isReadonly: modifiers.includes(SyntaxKind.ReadonlyKeyword)
      },
      ...(buildComment(jsdoc, ctx.linkTarget) ? { comment: buildComment(jsdoc, ctx.linkTarget) } : {})
    }

    if (isMethod || isAccessor) {
      const signature = convertSignature(ctx, memberReflection.name, member, depth)
      // 方法的 JSDoc 与函数同理：挂在签名上，声明自己不带
      delete memberReflection.comment
      memberReflection.signatures = [signature]
      if (member.kind === SyntaxKind.GetAccessor) memberReflection.type = signature.type
    } else if (record.type) {
      memberReflection.type = convertType(ctx, record.type as Node, depth + 1)
    }
    children.push(memberReflection)
  }

  // **成员一律按名字排序** —— TypeDoc 默认的 `sort` 就是这么做的
  // （`["kind", "instance-first", "alphabetical-ignoring-documents"]`），
  // 而黄金产物证实了它连内联对象的属性、接口成员一起排：
  // `ClientOptions` 源码是 cookies→request→debug，产物是 cookies→debug→request；
  // `LoginState` 各支的 `phase` 在源码里排第一，产物里被排到字母序的位置。
  // 不排的话会有 40 多个符号的类型文本与现网文档不一致。
  children.sort((a, b) => a.name.localeCompare(b.name))
  return {
    id: ctx.nextId(),
    name: '__type',
    kind,
    ...(children.length > 0 ? { children } : {}),
    ...(indexSignatures.length > 0 ? { indexSignatures } : {})
  }
}

// ─────────────────────────────── 顶层符号 ───────────────────────────────

const resolveAlias = (checker: Checker, symbol: TsSymbol): TsSymbol => {
  let current = symbol
  for (let hops = 0; hops < 10; hops++) {
    if ((current.flags & SymbolFlags.Alias) === 0) break
    const next = checker.getAliasedSymbol(current)
    if (!next || next === current) break
    current = next
  }
  return current
}

/** 声明是不是「`export type { X }`」里的那一个（类按接口出，见文件头） */
const isTypeOnlyExport = (node: Node | undefined): boolean => {
  let current = node
  for (let depth = 0; depth < 3 && current; depth++) {
    if (current.kind === SyntaxKind.ExportDeclaration && (current as unknown as { isTypeOnly?: boolean }).isTypeOnly === true) return true
    current = current.parent
  }
  return false
}

const FUNC_INITIALIZERS = new Set<number>([SyntaxKind.ArrowFunction, SyntaxKind.FunctionExpression])

/**
 * 符号 → `kind`。三条判据见文件头「与 TypeDoc 对齐的判据」，每一条都有实测支撑。
 * 变量那条必须看**声明有没有类型标注**，不能只看类型形状。
 */
const kindOfSymbol = (ctx: Context, symbol: TsSymbol, aliasNode: Node | undefined): number => {
  const flags = symbol.flags
  if (flags & SymbolFlags.TypeAlias) return ReflectionKind.TypeAlias
  if (flags & SymbolFlags.Interface) return ReflectionKind.Interface
  if (flags & SymbolFlags.Class) return isTypeOnlyExport(aliasNode) ? ReflectionKind.Interface : ReflectionKind.Class
  if (flags & SymbolFlags.Enum) return ReflectionKind.Enum
  if (flags & SymbolFlags.Namespace) return ReflectionKind.Namespace
  if (flags & SymbolFlags.Function) return ReflectionKind.Function
  if (flags & SymbolFlags.Variable) {
    const declaration = symbol.declarations[0]?.resolve(ctx.project)
    const record = declaration as unknown as Record<string, unknown> | undefined
    if (record && record.type === undefined && record.initializer && FUNC_INITIALIZERS.has((record.initializer as Node).kind))
      return ReflectionKind.Function
    return ReflectionKind.Variable
  }
  return ReflectionKind.Variable
}

// ─────────────────────────────── 主流程 ───────────────────────────────

export interface ExtractOptions {
  /** core 包的 tsconfig（绝对路径，posix 分隔符） */
  tsconfig: string
  /** 入口文件（绝对路径，posix 分隔符） */
  entry: string
  coreRoot: string
  repoUrl: string
  packageName?: string
  packageVersion?: string
}

/**
 * 抽出整棵 API 模型树。
 *
 * 两趟：先把顶层导出的 id 定下来（`{@link}` 只能连到它们），再逐个展开。
 * 一趟做完的话，链接目标那时还不知道自己的 id。
 */
export const extractApi = (options: ExtractOptions): ProjectJson => {
  const api = new API()
  const textCache = new Map<string, string>()
  try {
    const snapshot = api.updateSnapshot({ openProjects: [options.tsconfig] })
    const project = snapshot.getProject(options.tsconfig)
    if (!project) throw new Error(`打不开工程：${options.tsconfig}`)
    const checker = project.checker

    const textOf = (file: string): string => {
      if (!textCache.has(file)) {
        try {
          textCache.set(file, readFileSync(file, 'utf8'))
        } catch {
          textCache.set(file, '')
        }
      }
      return textCache.get(file) ?? ''
    }

    const entryFile = project.program.getSourceFile(options.entry)
    if (!entryFile) throw new Error(`入口文件不在工程里：${options.entry}`)
    const moduleSymbol = checker.getSymbolAtLocation(entryFile)
    if (!moduleSymbol) throw new Error(`入口文件取不到模块符号：${options.entry}`)
    const exportSymbols = checker.getExportsOfModule(moduleSymbol)

    let id = 0
    const nextId = (): number => ++id
    const links = new Map<string, number>()
    for (const symbol of exportSymbols) links.set(symbol.name, nextId())

    const ctx: Context = {
      checker,
      project,
      textOf,
      coreRoot: options.coreRoot,
      repoUrl: options.repoUrl,
      nextId,
      // 守卫是必需的：`node.operator` 这类字段给的是 SyntaxKind **数字**，不是节点，
      // 喂给 tsgo 的打印器会让它 panic（`unhandled Node: KindUnknown`）
      print: (node) => {
        if (!node || typeof (node as Node).getStart !== 'function') return ''
        // 语义节点（checker 造出来的）跨文件引用时会带上 import("../x").Foo 这种限定前缀，
        // 那是给编译器看的，页面上只要 Foo。用循环剥而不是正则 —— 正则里的转义
        // 在这个文件里已经被 shell 与模板字符串轮番吃过一次了
        let text = project.emitter.printNode(node)
        for (;;) {
          const at = text.indexOf(OPEN_IMPORT)
          if (at < 0) break
          const close = text.indexOf(CLOSE_IMPORT, at)
          if (close < 0) break
          text = text.slice(0, at) + text.slice(close + CLOSE_IMPORT.length)
        }
        return text
      },
      linkTarget: (name) => {
        if (/^https?:/.test(name)) return name
        return links.get(name)
      }
    }

    const children: Reflection[] = []
    for (const raw of exportSymbols) {
      const symbol = resolveAlias(checker, raw)
      const aliasNode = raw.declarations[0]?.resolve(project)
      const declaration = symbol.declarations[0]?.resolve(project)
      const kind = kindOfSymbol(ctx, symbol, aliasNode)
      const jsdoc = readJsDoc(declaration, textOf)
      const reflection: Reflection = {
        id: links.get(raw.name) ?? nextId(),
        name: raw.name,
        kind,
        ...(sourcesOf(ctx, declaration) ? { sources: sourcesOf(ctx, declaration) } : {})
      }

      if (kind === ReflectionKind.Function) {
        // 函数（含箭头变量）的 JSDoc 挂签名上；声明自己不带 —— 索引页因此没有摘要，与 TypeDoc 一致
        //
        // 箭头函数变量的**参数与返回类型在 initializer 上**，不在 VariableDeclaration 上。
        // 直接读声明会得到一个无参、返回 void 的签名（实测 43 个变量函数全中）
        const record = declaration as unknown as Record<string, unknown> | undefined
        const signatureNode =
          declaration && declaration.kind === SyntaxKind.VariableDeclaration && record?.initializer
            ? (record.initializer as Node)
            : (declaration as Node)
        const signature = convertSignature(ctx, raw.name, signatureNode, 0, declaration as Node)
        reflection.signatures = [signature]
      } else if (kind === ReflectionKind.TypeAlias) {
        const record = declaration as unknown as Record<string, unknown> | undefined
        const typeParameters = ((record?.typeParameters as readonly Node[] | undefined) ?? []).map((parameter) => {
          const inner = parameter as unknown as Record<string, unknown>
          return {
            id: nextId(),
            name: nameOf(ctx, inner.name as Node | undefined),
            kind: ReflectionKind.TypeParameter,
            ...(inner.constraint ? { type: convertType(ctx, inner.constraint as Node, 1) } : {})
          } satisfies Reflection
        })
        reflection.type = convertType(ctx, record?.type as Node | undefined, 0)
        if (typeParameters.length > 0) reflection.typeParameters = typeParameters
        if (buildComment(jsdoc, ctx.linkTarget)) reflection.comment = buildComment(jsdoc, ctx.linkTarget)
      } else if (kind === ReflectionKind.Variable) {
        const record = declaration as unknown as Record<string, unknown> | undefined
        const typeNode = record?.type as Node | undefined
        if (typeNode) reflection.type = convertType(ctx, typeNode, 0)
        else {
          const type = checker.getTypeOfSymbol(symbol)
          reflection.type = type ? { type: 'intrinsic', name: checker.typeToString(type) } : undefined
        }
        reflection.flags = { isConst: true }
        if (buildComment(jsdoc, ctx.linkTarget)) reflection.comment = buildComment(jsdoc, ctx.linkTarget)
      } else if (kind === ReflectionKind.Interface || kind === ReflectionKind.Class) {
        if (declaration)
          Object.assign(reflection, convertMembers(ctx, declaration, kind, 0), { id: reflection.id, name: reflection.name, kind })
        if (buildComment(jsdoc, ctx.linkTarget)) reflection.comment = buildComment(jsdoc, ctx.linkTarget)
      } else if (kind === ReflectionKind.Enum) {
        if (declaration)
          Object.assign(reflection, convertMembers(ctx, declaration, kind, 0), { id: reflection.id, name: reflection.name, kind })
        if (buildComment(jsdoc, ctx.linkTarget)) reflection.comment = buildComment(jsdoc, ctx.linkTarget)
      } else if (kind === ReflectionKind.Namespace) {
        const exports = symbol.getExports()
        const members: Reflection[] = []
        for (const [, member] of exports) {
          const target = resolveAlias(checker, member)
          const memberNode = target.declarations[0]?.resolve(project)
          const memberJsdoc = readJsDoc(memberNode, textOf)
          members.push({
            id: nextId(),
            name: member.name,
            kind: kindOfSymbol({ ...ctx } as Context, target, memberNode),
            ...(buildComment(memberJsdoc, ctx.linkTarget) ? { comment: buildComment(memberJsdoc, ctx.linkTarget) } : {}),
            ...(memberNode ? { sources: sourcesOf(ctx, memberNode) } : {})
          })
        }
        reflection.children = members
        if (buildComment(jsdoc, ctx.linkTarget)) reflection.comment = buildComment(jsdoc, ctx.linkTarget)
      }

      children.push(reflection)
    }

    return {
      name: options.packageName ?? 'api',
      children
    }
  } finally {
    api.close()
  }
}
