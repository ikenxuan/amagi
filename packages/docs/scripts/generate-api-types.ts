import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, sep } from 'node:path'

import {
  extractApi,
  ReflectionKind,
  type Comment,
  type CommentPart,
  type ProjectJson,
  type Reflection,
  type TypeDocType
} from './api-extractor'

/**
 * `content/docs/v7/usage/api/types/**` —— 第三批生成物，也是**唯一不从端点注册表
 * 派生**的一批：输入是 `packages/core/src/index.ts` 的公开导出面，由
 * `api-extractor.ts` 抽成一棵 API 模型树，这里再渲染成 MDX。
 *
 * 为什么不是「另建一个静态站，再拷到 `/types/`」（2026-09-13 之前的做法）：
 *
 * 1. 静态站用**相对自身深度**的资源引用（`assets/style.css` /
 *    `../assets/style.css`），只在「URL 一定以 `/` 结尾」时才对。`/amagi/types`
 *    不带结尾斜杠不跳转时整页白屏 —— `post-export.mjs` 第 5 步一直在给别人的
 *    产物打这个补丁；
 * 2. 样式、侧边栏、搜索、主题切换与文档站完全不统一，读着像进了另一个站，
 *    站内搜索也搜不到 API 参考；
 * 3. 每构建一次要多跑一遍 HTML 渲染 + 拷 460 个文件。
 *
 * **抽取那一半 2026-09-15 从 TypeDoc 换成了 `api-extractor.ts`**（TS7 原生接口，
 * 理由见那个文件的头注释）；本文件只负责渲染，输入是它产出的模型树。
 * 渲染这半边没动过 —— 模型树的字段名与 `kind` 数值刻意沿用 TypeDoc 的约定，
 * 就是为了这一半一行都不用改。
 *
 * 分页与渲染的取舍见各段注释。产物由 `docs:api` 在 `next build` / `next dev` /
 * `typecheck` 之前生成。
 */

/** core 包根（`packages/core`），抽取器的入口、tsconfig 与源码都在它下面 */
const CORE = join('..', 'core')
const OUT = './content/docs/v7/usage/api/types'
/** 站内地址前缀，索引页的锚点链接与页内互链都基于它 */
const URL_BASE = '/docs/v7/usage/api/types'
/** 同一批能力的另外两种形态，页头互相链过去（跨页地址要自己拼，别在 URL_BASE 后面接 `../`） */
const SDK_URL = '/docs/v7/usage/api/sdk/douyin'
const HTTP_URL = '/docs/v7/usage/api/http'

/**
 * 一页能放多少东西，取决于「读者能不能找得到」，不取决于体积 ——
 * 413 个符号全部渲染出来只有约 140 KB Markdown（最大的单个 `createClient` 7 KB），
 * 一页塞得下，但没人愿意在 291 个类型别名里滚。
 *
 * 所以先按 kind 分（读 API 参考的第一问是「这是函数还是类型」），再把 291 个
 * 别名按平台切：其中 90% 是响应类型，而读者嘴里说的是「抖音的返回类型」。
 * v7 自有的 31 个别名连同那唯一一个命名空间单独一页，它们是「读源码时要查的」，
 * 与「调接口时对照返回结构」不是同一件事。
 */
type PageId = 'index' | 'functions' | 'classes' | 'interfaces' | 'types' | 'types-bilibili' | 'types-douyin' | 'types-rest'

interface PageDef {
  /** 文件名（不含 .mdx），也是侧边栏条目的 slug */
  id: PageId
  title: string
  /** `lucide-react` 的导出名，由 `scripts/check-sidebar.mjs` 逐个核 */
  icon: string
}

/**
 * 侧边栏顺序 = 这个数组的顺序（`meta.json` 的 `pages` 就是它）。
 *
 * `types-bilibili` / `types-douyin` 的图标与 SDK 四页、HTTP 平台目录**刻意取同一份**
 * （见 `scripts/generate-docs.ts` 的 `PLATFORM_ICONS`）：同一个平台在侧边栏里
 * 出现三次，配两种图标读者只会以为是两个东西。
 *
 * 各页的 `description` 不写在这里 —— 它由符号数现算（写死一个数就是等着它和
 * `src/index.ts` 的导出面对不上）。
 */
const PAGES: PageDef[] = [
  { id: 'index', title: '类型索引', icon: 'List' },
  { id: 'functions', title: '函数', icon: 'SquareFunction' },
  { id: 'classes', title: '类、枚举与变量', icon: 'Boxes' },
  { id: 'interfaces', title: '接口', icon: 'Braces' },
  { id: 'types', title: '核心类型', icon: 'Shapes' },
  { id: 'types-bilibili', title: 'B站响应类型', icon: 'Tv' },
  { id: 'types-douyin', title: '抖音响应类型', icon: 'Music' },
  { id: 'types-rest', title: '快手 / 小红书 / 通用响应类型', icon: 'Layers' }
]

// ─────────────────────────────── 类型文本 ───────────────────────────────

/**
 * 嵌套深度上限。超了就打 `…`：`createClient` 的返回类型是一棵 105 个嵌套
 * reflection 的树，展开是 7 KB 的「一行类型」，既读不了也不是读者要的
 * （客户端的方法在 SDK 方法页里有正经的表格）。
 */
const MAX_DEPTH = 4
/** 单个类型文本的字符上限，同上 */
const MAX_CHARS = 900
/** 表格单元格里的类型文本上限 —— 单元格宽度就那么多 */
const MAX_CELL_CHARS = 240

const clip = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, max)}…`)

/**
 * 截断**含 markdown 行内代码的**文本到 `max` 字符。
 *
 * 不能直接用 `slice`：摘要是 markdown，里面可能有 `` `{ amagi: { cookie: false } }` ``
 * 这样的行内代码。固定字符数一刀下去若切在代码 span 中间，闭合反引号就丢了，
 * 里面的 `{` 在 MDX 眼里变成裸的表达式起点，解析器一路扫到文件尾找 `}`，
 * 整个文档站构建挂掉（2026-09-17 索引页 `AmagiRequestOptions` 那行就是这么炸的）。
 *
 * 做法：从头扫到上限，只在「不在 `` ` `` span 里、且裸 `{}` 配平」的位置记为安全
 * 切点；上限处不安全就退到最后一个安全切点。类型文本用 `clip` 即可 —— 它们裁完
 * 还会整体包进行内代码，切在哪都不会漏出裸 `{`。
 */
const safeClip = (text: string, max: number): string => {
  if (text.length <= max) return text
  let inCode = false
  let braceDepth = 0
  let lastSafe = 0
  for (let i = 0; i < max; i++) {
    const ch = text[i]
    if (ch === '`') {
      inCode = !inCode
    } else if (!inCode) {
      if (ch === '{') braceDepth++
      else if (ch === '}' && braceDepth > 0) braceDepth--
    }
    if (!inCode && braceDepth === 0) lastSafe = i + 1
  }
  return `${text.slice(0, lastSafe)}…`
}

/**
 * TypeDoc 的类型对象 → TypeScript 类型文本
 * @param type - 类型对象
 * @param depth - 当前嵌套深度
 * @returns 可直接写进代码块或表格的类型文本
 */
const typeToText = (type: TypeDocType | undefined, depth = 0, maxDepth = MAX_DEPTH): string => {
  if (!type) return 'unknown'
  if (depth > maxDepth) return '…'
  const next = depth + 1
  const list = (types: TypeDocType[] | undefined, glue: string): string =>
    (types ?? []).map((one) => typeToText(one, next, maxDepth)).join(glue)
  const args = type.typeArguments?.length ? `<${list(type.typeArguments, ', ')}>` : ''

  switch (type.type) {
    case 'intrinsic':
    case 'unknown':
    case 'inferred':
      return type.name ?? 'unknown'
    case 'literal':
      // 用双引号包字符串字面量，不是单引号 —— 这个值会被 jsValue(JSON.stringify)
      // 包成 JSON 字符串塞进 MDX 的 JSX 表达式里，而 MDX 的解析器把 `"` 与 `'`
      // 都当字符串边界，单引号会让它提前结束字符串、把后面的 `|` 当成表达式语法，
      // 报成「lazy line in container」。双引号在 JSON 字符串里会被 `jsValue` 转义成
      // `\"`，解析器看到的是 `\"` 而不是 `"`，不会触发边界误判。
      return typeof type.value === 'string' ? `"${type.value}"` : String(type.value)
    case 'reference':
      return `${type.name ?? 'unknown'}${args}`
    case 'union':
      return list(type.types, ' | ')
    case 'intersection':
      return list(type.types, ' & ')
    case 'array':
      return `${typeToText(type.elementType, next, maxDepth)}[]`
    case 'tuple':
      return `[${(type.elements ?? []).map((one) => typeToText(one, next, maxDepth)).join(', ')}]`
    case 'namedTupleMember':
      return `${type.name ?? ''}${type.isOptional === true ? '?' : ''}: ${typeToText(type.element, next, maxDepth)}`
    case 'rest':
      return `...${typeToText(type.elementType, next, maxDepth)}`
    case 'optional':
      return `${typeToText(type.elementType, next, maxDepth)}?`
    case 'typeOperator':
      // 字段名是 `target` 而不是 `targetType`（TypeDoc 的 models/types.d.ts 里
      // `TypeOperatorType.target`）—— 写错会静默退化成 `readonly unknown`
      return `${type.operator ?? 'keyof'} ${typeToText(type.target, next, maxDepth)}`
    case 'indexedAccess':
      return `${typeToText(type.objectType, next, maxDepth)}[${typeToText(type.indexType, next, maxDepth)}]`
    case 'query':
      return `typeof ${typeToText(type.queryType, next, maxDepth)}`
    case 'conditional':
      return `${typeToText(type.checkType, next, maxDepth)} extends ${typeToText(type.extendsType, next, maxDepth)} ? ${typeToText(type.trueType, next, maxDepth)} : ${typeToText(type.falseType, next, maxDepth)}`
    case 'mapped':
      return `{ [${type.parameter ?? 'K'} in ${typeToText(type.parameterType, next, maxDepth)}]${type.optionalModifier === '+' ? '?' : ''}: ${typeToText(type.templateType, next, maxDepth)} }`
    case 'templateLiteral':
      // `tail` 是 `[类型, 字面文本][]` 的元组数组，不是两个平行数组
      // （按平行数组读会渲染出 `` `BV1${unknown}[object Object]` ``）
      return `\`${type.head ?? ''}${(type.tail ?? []).map(([inner, text]) => `\${${typeToText(inner, next, maxDepth)}}${text ?? ''}`).join('')}\``
    case 'predicate':
      return `${type.asserts === true ? 'asserts ' : ''}${type.name ?? 'value'}${type.targetType ? ` is ${typeToText(type.targetType, next, maxDepth)}` : ''}`
    case 'reflection': {
      const declaration = type.declaration
      if (!declaration) return 'object'
      if (declaration.signatures?.length) return signatureText(declaration.signatures[0], next, maxDepth)
      if (declaration.children?.length) {
        // 成员多到一定程度就不再铺开：`createClient` 的返回类型是 105 个成员的
        // 内联对象，全展开是一行 7 KB 的类型（读者要的客户端方法在 SDK 方法页里
        // 有正经的表格）。留前 6 个把形状说清楚，其余只报个数
        const shown = declaration.children.slice(0, 6)
        const members = shown.map((child) => `${memberName(child)}: ${typeToText(child.type, next, maxDepth)}`)
        const rest = declaration.children.length - shown.length
        return `{ ${members.join('; ')}${rest > 0 ? `; …其余 ${rest} 个成员` : ''} }`
      }
      if (declaration.indexSignatures?.length)
        return `{ [key: string]: ${typeToText(declaration.indexSignatures[0].type, next, maxDepth)} }`
      return 'object'
    }
    default:
      return 'unknown'
  }
}

/**
 * 类型文本，长了就**逐档收窄**重渲染。
 *
 * 直接在字符数上切断会切在莫名其妙的地方（`createClient` 的返回类型实测截成
 * `on: _…`）。收窄 = 内联对象只展开到第 N 层，剩下的报成员个数：形状还在，
 * 长度掉一个数量级。到最窄还超才硬截。
 * @param render - 按给定深度上限渲染一次
 * @param maxChars - 允许的最大长度
 * @returns 渲染结果
 */
const fitText = (render: (maxDepth: number) => string, maxChars: number): string => {
  for (const maxDepth of [MAX_DEPTH, 2, 1]) {
    const text = render(maxDepth)
    if (text.length <= maxChars) return text
  }
  return clip(render(1), maxChars)
}

const typeText = (type: TypeDocType | undefined, maxChars: number): string => fitText((maxDepth) => typeToText(type, 0, maxDepth), maxChars)

/** 成员名：带引号或可选标记时补上，否则 `'a-b'?: T` 这种会被读成别的意思 */
const memberName = (reflection: Reflection): string => {
  const name = /^[A-Za-z_$][\w$]*$/.test(reflection.name) ? reflection.name : JSON.stringify(reflection.name)
  const optional = reflection.flags?.isOptional === true || reflection.flags?.isReadonly === true ? '?' : ''
  return `${readonlyPrefix(reflection)}${name}${optional}`
}

const readonlyPrefix = (reflection: Reflection): string => (reflection.flags?.isReadonly === true ? 'readonly ' : '')

/**
 * 一个签名的文本：`name(params): ReturnType`
 * @param signature - 签名 reflection
 * @param depth - 嵌套深度
 * @returns 单行签名
 */
const signatureText = (signature: Reflection, depth = 0, maxDepth = MAX_DEPTH): string => {
  const params = (signature.parameters ?? []).map((parameter) => {
    const rest = parameter.flags?.isRest === true ? '...' : ''
    const optional = parameter.flags?.isOptional === true ? '?' : ''
    return `${rest}${parameter.name}${optional}: ${typeToText(parameter.type, depth + 1, maxDepth)}`
  })
  const typeParameters = signature.typeParameters?.length ? `<${signature.typeParameters.map((one) => one.name).join(', ')}>` : ''
  return `${signature.name}${typeParameters}(${params.join(', ')}): ${typeToText(signature.type, depth + 1, maxDepth)}`
}

// ─────────────────────────────── 注释 ───────────────────────────────

/** 锚点里只留 `[\w$.-]`：命名空间的名字带 `/`（`platforms/douyin/passport`），斜杠在 fragment 里能用，但没必要冒险 */
const anchorOf = (name: string): string => name.replace(/[^\w$.-]/g, '-').replace(/^(\d)/, 'x$1')

/**
 * 注释文本 → MDX 安全文本。
 *
 * TypeDoc 的注释是 Markdown，但**不是安全的 MDX**：`<` 会被当成 JSX 标签、
 * `{` 会被当成 JS 表达式（实测注释里就有 `{ code }`、`AmagiResult<T>` 这样的写法）。
 *
 * 转义必须**跳过代码**：注释里能嵌 ` ```ts ` 代码块（`isSuccess` 的摘要里就有一块
 * `AmagiResult<Work>[]`），把里面的 `<` 转成 `&lt;` 会原样显示在页面上 —— 代码块
 * 与行内代码里的尖括号/花括号本来就是字面量，MDX 在围栏里也不做 JSX 解析。
 * @param text - 注释里的文本片段
 * @returns 可直接进 MDX 的文本
 */
const escapeMdx = (text: string): string => {
  let fenced = false
  return text
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) {
        fenced = !fenced
        return line
      }
      if (fenced) return line
      // 行内代码整段跳过（`` `a < b` `` 里的 `<` 是字面量）
      return line
        .split(/(`+[^`]*`+)/)
        .map((segment) =>
          segment.startsWith('`') ? segment : segment.replace(/</g, '&lt;').replace(/[{}]/g, (char) => (char === '{' ? '&#123;' : '&#125;'))
        )
        .join('')
    })
    .join('\n')
}

/**
 * 表格单元格里的说明。
 *
 * `TypeTable` 的 `description` 是 React 属性里的**纯字符串**，不是 Markdown：
 * 反引号、围栏行、实体转义（`&#123;`）都会原样显示出来。
 * @param text - 注释文本
 * @returns 去掉标记的纯文本
 */
const plainText = (text: string): string =>
  text
    .replace(/^\s*```.*$/gm, '')
    .replace(/`/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

/** 行内代码：文本自己带反引号时用双反引号围，否则 `` `a` `` 会被截断 */
const inlineCode = (text: string): string => {
  const fence = text.includes('`') ? '``' : '`'
  return `${fence}${text}${fence}`
}

// ─────────────────────────────── 站内链接 ───────────────────────────────

/** 顶层导出：id → 它落在哪一页、锚点叫什么。`{@link}` 与索引页都靠它 */
const symbolIndex = new Map<number, { name: string; page: PageId; anchor: string }>()

/**
 * 注释里的一段 → Markdown
 *
 * `{@link X}` 是这次替换掉 HTML 站时最容易漏出去的东西：漏了就原样显示成
 * `{@link X}`，而且**不会报错**（实测注释里 83 处）。所以 `@link` 单独处理：
 * 能查到站内锚点就连过去，查不到（目标没导出，TypeDoc 自己也会为它报
 * 「resolved but is not included in the documentation」）就退化成纯文本。
 * @param part - 注释片段
 * @param mode - `md` 走 Markdown（正文），`plain` 走纯文本（`TypeTable` 的属性）
 * @returns 该片段的文本
 */
const partToText = (part: CommentPart, mode: 'md' | 'plain'): string => {
  if (part.kind === 'code') {
    // TypeDoc 的 `code` 片段**自带反引号**（源码里的 `` `x` `` 原样留在 text 里），
    // 再包一层就是三个反引号 —— 实测会把 `` `satisfies` `` 渲染成 ```satisfies```
    const text = part.text ?? ''
    if (mode === 'plain') return plainText(text)
    return text.includes('`') ? escapeMdx(text) : inlineCode(text)
  }
  if (part.kind === 'inline-tag') {
    const label = part.text ?? ''
    if (part.tag !== '@link') return mode === 'plain' ? label : escapeMdx(label)
    // `{@link https://…}` 的 target 是**字符串 URL**，不是 id —— 实测 9 处，
    // 当成 id 查会全部退化成纯文本，外链就没了
    if (typeof part.target === 'string') {
      if (mode === 'plain') return label
      return part.target.startsWith('http') ? `[${label}](${part.target})` : inlineCode(label)
    }
    const target = typeof part.target === 'number' ? symbolIndex.get(part.target) : undefined
    if (!target || mode === 'plain') return mode === 'plain' ? label : inlineCode(label)
    return `[${inlineCode(label)}](${URL_BASE}/${target.page === 'index' ? '' : target.page}#${target.anchor})`
  }
  if (part.kind === 'relative-link') {
    const href = typeof part.target === 'string' ? part.target : undefined
    if (mode === 'plain') return part.text ?? ''
    return href?.startsWith('http') ? `[${part.text}](${href})` : escapeMdx(part.text ?? '')
  }
  return mode === 'plain' ? plainText(part.text ?? '') : escapeMdx(part.text ?? '')
}

const commentParagraphs = (comment: Comment | undefined, tag: string, mode: 'md' | 'plain' = 'md'): string[] =>
  (comment?.blockTags ?? [])
    .filter((block) => block.tag === tag)
    .map((block) =>
      (block.content ?? [])
        .map((part) => partToText(part, mode))
        .join('')
        .trim()
    )

/**
 * 摘要（`comment.summary`）→ 段落。
 *
 * 片段之间**不补空格**：TypeDoc 已经把空格放在文本里了（`code` 片段两侧的空格
 * 由相邻 text 片段携带），补一次会变成 `「见 ` 和 `` `foo` `` 之间两个空格。
 * @param comment - 注释
 * @returns 摘要文本（含块标记之外的正文）
 */
const summaryOf = (comment: Comment | undefined, mode: 'md' | 'plain' = 'md'): string =>
  (comment?.summary ?? [])
    .map((part) => partToText(part, mode))
    .join('')
    .trim()

/**
 * `@example` / `@defaultValue` 之类块标记的内容。
 *
 * `@example` 里的代码 TypeDoc 用 `code` 片段给（不带围栏），含换行的按代码块出，
 * 否则按行内代码 —— 与摘要里 `` `x` `` 走的是同一个片段种类，只能靠换行区分。
 * @param content - 块标记的内容片段
 * @returns Markdown
 */
const blockToText = (content: CommentPart[] | undefined): string =>
  (content ?? [])
    .map((part) => {
      if (part.kind !== 'code') return partToText(part, 'md')
      const text = (part.text ?? '').replace(/^\n+|\n+$/g, '')
      // `@example` 里的代码片段**自带围栏**（```typescript），原样吐出去会带上
      // 一个本站没声明语言的围栏 —— 统一改成 `ts`（`langs` 只保证 ts/tsx/js/jsx）
      if (text.startsWith('```')) return text.replace(/^```[^\n]*\n/, '```ts\n')
      return text.includes('\n') ? `\`\`\`ts\n${text}\n\`\`\`` : inlineCode(text)
    })
    .join('')
    .trim()

// ─────────────────────────────── 渲染 ───────────────────────────────

/** `sources[0].url` → GitHub 上的那一行。外部包（`response-types/dist/**.d.ts`）没有 url，就不给链接 */
const sourceLine = (reflection: Reflection): string => {
  const source = reflection.sources?.[0]
  if (!source) return ''
  return source.url
    ? `源码：[\`${source.fileName}\`](${source.url})`
    : `源码：\`${source.fileName}\`（${source.fileName.startsWith('response-types/') ? '由 `pnpm gen:types` 生成，不在 git 里，故无链接' : '无链接'}）`
}

/** JSX 属性里的字符串字面量。`JSON.stringify` 把引号、反斜杠、换行一次处理干净 */
const jsValue = (value: string): string => JSON.stringify(value)

/** 表格单元格：`|` 与换行都会把表切断 */
const cell = (text: string): string => text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim()

/**
 * 构造 `<TypeTable>` 的属性对象文本
 * @param rows - `[键名, 类型, 说明, 必填, 默认值]`
 * @returns JSX 属性对象（`type={{ … }}`）
 */
const typeTable = (rows: [string, string, string, boolean, string?][]): string => {
  const body = rows
    .map(([name, type, description, required, defaultValue]) => {
      const fields = [`type: ${jsValue(clip(type, MAX_CELL_CHARS))}`]
      if (description !== '') fields.push(`description: ${jsValue(description)}`)
      if (defaultValue !== undefined) fields.push(`default: ${jsValue(defaultValue)}`)
      if (required) fields.push('required: true')
      return `    ${JSON.stringify(name)}: { ${fields.join(', ')} }`
    })
    .join(',\n')
  return `<TypeTable\n  type={{\n${body}\n  }}\n/>`
}

/** 参数表：说明取参数的 `comment.summary`，必填取 `flags.isOptional` */
const paramTable = (parameters: Reflection[]): string => {
  if (parameters.length === 0) return ''
  return typeTable(
    parameters.map((parameter) => [
      parameter.name,
      typeToText(parameter.type),
      summaryOf(parameter.comment, 'plain'),
      parameter.flags?.isOptional !== true && parameter.flags?.isDefaulted !== true,
      parameter.defaultValue
    ])
  )
}

/**
 * 一个 reflection 的正文（不含标题）。
 *
 * 六种 kind 各走一条分支，其余（构造签名、索引签名、访问器…）统一走
 * 「签名块 + 参数表」的兜底，保证**没有东西会凭空消失**。
 */
const bodyOf = (reflection: Reflection): string[] => {
  const parts: string[] = []
  // 函数的 JSDoc **挂在签名上**，不在声明上（`kind: 64` 的 reflection 自己没有
  // comment）。只读 `reflection.comment` 的话，48 个函数的摘要、`@returns`、
  // `@example` 会全部凭空消失 —— 而且构建绿、页面上什么错都不报
  const comment = reflection.comment ?? reflection.signatures?.[0]?.comment
  const summary = summaryOf(comment)
  if (summary !== '') parts.push(summary)

  const deprecated = commentParagraphs(comment, '@deprecated')
  if (deprecated.length > 0) {
    parts.push(
      `<Callout type="warn">**已废弃（\`@deprecated\`）**：${deprecated[0] === '' ? '源码注释里标了它，后续版本会移除。' : deprecated[0]}</Callout>`
    )
  }

  const signatures = reflection.signatures ?? []
  const isCallable =
    reflection.kind === ReflectionKind.Function ||
    reflection.kind === ReflectionKind.Method ||
    reflection.kind === ReflectionKind.Constructor

  if (reflection.kind === ReflectionKind.Class) {
    const declaration = `class ${reflection.name}`
    parts.push(`\`\`\`ts\n${declaration}\n\`\`\``)
  } else if (reflection.kind === ReflectionKind.TypeAlias && reflection.type) {
    parts.push(`\`\`\`ts\ntype ${reflection.name}${typeParametersText(reflection)} = ${typeText(reflection.type, MAX_CHARS)}\n\`\`\``)
  } else if (
    reflection.kind === ReflectionKind.Variable ||
    reflection.kind === ReflectionKind.Property ||
    reflection.kind === ReflectionKind.Accessor
  ) {
    parts.push(
      `\`\`\`ts\n${reflection.flags?.isConst === true ? 'const' : 'let'} ${memberName(reflection)}: ${typeText(reflection.type, MAX_CHARS)}\n\`\`\``
    )
  } else if (isCallable || signatures.length > 0) {
    for (const signature of signatures) {
      const full = signatureText(signature)
      const text = full.length <= MAX_CHARS ? full : fitText((maxDepth) => signatureText(signature, 0, maxDepth), MAX_CHARS)
      parts.push(`\`\`\`ts\n${text}\n\`\`\``)
      const typeParameters = signature.typeParameters ?? reflection.typeParameters
      if (typeParameters?.length) {
        // 约束常常是 25 个成员的联合类型（`assertValid*Params` 的 `T extends '…'`），
        // 整条铺出来是一个没人读得完的段落
        const names = typeParameters.map((one) => `${one.name}${one.type ? ` extends ${clip(typeToText(one.type), MAX_CELL_CHARS)}` : ''}`)
        parts.push(`类型参数：${names.map((name) => inlineCode(name)).join('、')}`)
      }
      const table = paramTable(signature.parameters ?? [])
      if (table !== '') parts.push(table)
      break
    }
  } else if (reflection.type) {
    parts.push(`\`\`\`ts\n${typeText(reflection.type, MAX_CHARS)}\n\`\`\``)
  }

  if (reflection.kind === ReflectionKind.Interface || reflection.kind === ReflectionKind.TypeLiteral) {
    const rows = (reflection.children ?? []).map((child): [string, string, string, boolean, string?] => [
      child.name,
      typeToText(child.type),
      summaryOf(child.comment, 'plain'),
      child.flags?.isOptional !== true,
      child.defaultValue
    ])
    // 索引签名（`[key: string]: T`）没有名字，单独一行说清楚 —— 它是响应类型的
    // 「平台加字段不算 breaking」那条承诺的落点，不能被当成没写
    for (const index of reflection.indexSignatures ?? []) {
      rows.push([index.parameters?.[0]?.name ?? 'key', typeToText(index.type), '索引签名：任意键都取这个类型', false])
    }
    if (rows.length > 0) parts.push(typeTable(rows))
  }

  if (reflection.kind === ReflectionKind.Enum) {
    const rows = (reflection.children ?? []).map((child): [string, string, string, boolean, string?] => [
      child.name,
      typeToText(child.type),
      summaryOf(child.comment, 'plain'),
      false,
      child.defaultValue
    ])
    if (rows.length > 0) parts.push(typeTable(rows))
  }

  // 空内容的块标记（`@returns` 后面什么都没写，源码里有）不占版面
  const filled = (tag: string): string[] => commentParagraphs(comment, tag).filter((text) => text !== '')

  const returns = filled('@returns')
  if (returns.length > 0) parts.push(`**返回值**：${returns.join(' ')}`)

  const throws = filled('@throws')
  if (throws.length > 0) parts.push(`**可能抛出**：${throws.join(' ')}`)

  const defaultValue = filled('@defaultValue').concat(filled('@default'))
  if (defaultValue.length > 0) parts.push(`**默认值**：${defaultValue.join(' ')}`)

  for (const example of (comment?.blockTags ?? []).filter((block) => block.tag === '@example')) {
    parts.push(`**示例**\n\n${blockToText(example.content)}`)
  }

  const see = filled('@see')
  if (see.length > 0) parts.push(`**另见**：${see.join(' ')}`)

  const source = sourceLine(reflection)
  if (source !== '') parts.push(source)
  return parts
}

/** 泛型参数（`type X<T> = …` 的那个 `<T>`） */
const typeParametersText = (reflection: Reflection): string => {
  const parameters = reflection.typeParameters
  if (!parameters?.length) return ''
  return `<${parameters.map((one) => `${one.name}${one.type ? ` extends ${clip(typeToText(one.type), MAX_CHARS)}` : ''}`).join(', ')}>`
}

/**
 * 一个符号（含它的成员）→ 一组小节。
 *
 * 成员一律用 `####` 而不是塞进表格：类的成员里既有属性也有方法，方法的签名
 * 带对象参数时在单元格里只能截断，那是把「查得到」换成「看着整齐」。
 * @param reflection - 符号
 * @param level - 标题层级（页级符号 3，成员 4）
 * @param prefix - 成员锚点的前缀（父符号名），避免 `ApiError` 与 `AmagiThrownError` 的 `message` 撞车
 * @returns Markdown 片段
 */
const renderSymbol = (reflection: Reflection, level = 3, prefix = ''): string => {
  const anchor = prefix === '' ? anchorOf(reflection.name) : anchorOf(`${prefix}-${reflection.name}`)
  const heading = `${'#'.repeat(level)} ${reflection.name} [#${anchor}]`
  const parts = [heading, '', ...bodyOf(reflection)]

  for (const child of reflection.children ?? []) {
    // 接口/枚举的成员已经由 bodyOf 的表覆盖，这里只展开命名空间与类的成员
    if (reflection.kind !== ReflectionKind.Namespace && reflection.kind !== ReflectionKind.Class) continue
    parts.push('', renderSymbol(child, level + 1, reflection.name))
  }

  return parts.join('\n')
}

/** 一页的正文：符号之间空一行 */
const renderPage = (symbols: Reflection[]): string => symbols.map((symbol) => renderSymbol(symbol)).join('\n\n')

// ─────────────────────────────── 分页 ───────────────────────────────

/** 平台 → 它那一页。大小写不统一的两个来源（`ReturnDataType/Bilibili` 与 `generated/bilibili`）都走这里 */
const platformPage = (name: string): PageId => {
  if (name === 'bilibili') return 'types-bilibili'
  if (name === 'douyin') return 'types-douyin'
  return 'types-rest'
}

/**
 * 类型别名落哪一页。
 *
 * 两份来源按平台分：v6 的实测快照树 `types/ReturnDataType/<平台>/`，与
 * `pnpm gen:types` 生成的 `response-types/dist/generated/<平台>/`。
 * 其余（`types/` 下的跨平台类型、v6 的 `platforms/legacy/`）进「其余」页，而
 * **v7 自有的**（`contracts/`、`model/`、`server/`…）单独一页 ——
 * 那些是读源码时要查的，与「调接口时对照返回结构」不是同一件事。
 * @param fileName - `sources[0].fileName`（相对 core 包根）
 * @returns 页 id
 */
const aliasPage = (fileName: string): PageId => {
  // `sources[].fileName` 是相对 basePath（core 包根）的：**包内**的写成
  // `src/contracts/error.ts`，**包外**的（`@ikenxuan/amagi-response-types` 生成的
  // .d.ts）写成 `../response-types/dist/generated/...` —— 两种前缀都得先抹掉，
  // 否则下面每一条 startsWith 都落空，全部堆到「核心类型」那一页（实测 79 KB）
  const path = fileName
    .toLowerCase()
    .replace(/^(\.\.\/)+/, '')
    .replace(/^src\//, '')
  if (path.startsWith('response-types/')) return platformPage(path.split('/')[3] ?? '')
  if (path.startsWith('types/returndatatype/')) return platformPage(path.split('/')[2] ?? '')
  if (path.startsWith('types/') || path.startsWith('platform/')) return 'types-rest'
  return 'types'
}

/**
 * 符号落在哪一页。
 *
 * 别名之外的 kind 直接按 kind 分；291 个别名按来源分（见 `aliasPage`）。
 * @param reflection - 顶层导出
 * @returns 页 id
 */
const pageOf = (reflection: Reflection): PageId => {
  switch (reflection.kind) {
    case ReflectionKind.Function:
      return 'functions'
    case ReflectionKind.Class:
    case ReflectionKind.Enum:
    case ReflectionKind.Variable:
    case ReflectionKind.Namespace:
      return 'classes'
    case ReflectionKind.Interface:
      return 'interfaces'
    default:
      return aliasPage(reflection.sources?.[0]?.fileName ?? '')
  }
}

/**
 * 索引页：**413 个符号一个不落**地列出来，每个链到它那一页的锚点。
 *
 * 这一页是「站内搜索搜得到 API 参考」这件事的落点 —— 换了 HTML 站之后，
 * 读者在搜索框里打一个类型名，命中的应该是这里，而不是一个只有标题的页。
 * 表格按页分组，与侧边栏顺序一致。
 */
const indexPage = (byPage: Map<PageId, Reflection[]>): string => {
  const sections = PAGES.filter((def) => def.id !== 'index' && (byPage.get(def.id)?.length ?? 0) > 0).map((def) => {
    const rows = (byPage.get(def.id) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((symbol) => {
        const summary = cell(summaryOf(symbol.comment))
        return `| [\`${cell(symbol.name)}\`](${URL_BASE}/${def.id}#${anchorOf(symbol.name)}) | ${cell(kindName(symbol.kind))} | ${safeClip(summary, 90)} |`
      })
    return `## ${def.title}\n\n| 符号 | 种类 | 说明 |\n| --- | --- | --- |\n${rows.join('\n')}`
  })

  const total = [...byPage.values()].reduce((sum, symbols) => sum + symbols.length, 0)
  return `---
title: 类型索引
description: ${total} 个公开导出的总索引，按页面分组
icon: List
---

{/* 本页由 scripts/generate-api-types.ts 在构建期生成，不要手改。 */}

<Callout type="info">
  本页索引 ${total} 个符号，覆盖 \`@ikenxuan/amagi\` 的**全部公开导出**（\`src/index.ts\`
  的导出面）。每个符号的签名、参数表与源码位置在它自己那一页；同一批能力的
  **HTTP 形态**见 [HTTP 端点参考](${HTTP_URL})，**SDK 形态**见
  [各平台 SDK 方法页](${SDK_URL})。
</Callout>

${sections.join('\n\n')}
`
}

const KIND_NAMES: Record<number, string> = {
  [ReflectionKind.Namespace]: '命名空间',
  [ReflectionKind.Enum]: '枚举',
  [ReflectionKind.Variable]: '变量',
  [ReflectionKind.Function]: '函数',
  [ReflectionKind.Class]: '类',
  [ReflectionKind.Interface]: '接口',
  [ReflectionKind.TypeAlias]: '类型别名'
}

const kindName = (kind: number): string => KIND_NAMES[kind] ?? '其它'

// ─────────────────────────────── 主流程 ───────────────────────────────

const data: ProjectJson = extractApi({
  // 路径全用绝对路径，并转成 posix 分隔符：抽取器把它们交给 tsgo，Windows 的
  // 反斜杠在入口路径上会撞上 `escapes a non-special character`（TypeDoc 时代实测过）
  tsconfig: join(process.cwd(), CORE, 'tsconfig.json').split(sep).join('/'),
  entry: join(process.cwd(), CORE, 'src', 'index.ts').split(sep).join('/'),
  coreRoot: join(process.cwd(), CORE).split(sep).join('/'),
  repoUrl: 'https://github.com/ikenxuan/amagi/blob/main/packages/core'
})

// 一个符号都没抽到，通常意味着入口路径或 tsconfig 对不上，而不是「这个包真是空的」——
// 少了这条守卫，后面只会在 `for (const symbol of data.children)` 上炸出一句
// 与真正原因无关的 TypeError（入口路径写错时实测如此）
if (data.children.length === 0) throw new Error(`一个顶层导出都没抽到（${join(CORE, 'src', 'index.ts')}）—— 多半是入口路径或 tsconfig`)

console.log(`API 模型：${data.children.length} 个顶层导出`)

// 顶层导出先全部登记，`{@link}` 才有得查
const byPage = new Map<PageId, Reflection[]>()
for (const symbol of data.children) {
  const page = pageOf(symbol)
  symbolIndex.set(symbol.id, { name: symbol.name, page, anchor: anchorOf(symbol.name) })
  byPage.set(page, [...(byPage.get(page) ?? []), symbol])
}

// 与 HTTP / SDK 两批同规矩：先删再生成 —— 符号改名或换页之后，旧页留在
// content 里会被 getPages() 继续吐出来，而且它是 gitignore 的，没人会看见
await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

for (const def of PAGES) {
  if (def.id === 'index') continue
  const symbols = (byPage.get(def.id) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name))
  if (symbols.length === 0) throw new Error(`页 ${def.id} 一个符号都没有 —— 分页规则与抽取器的 kind 对不上了`)
  const header = `---
title: ${def.title}
description: ${symbols.length} 个符号，由 scripts/api-extractor.ts 从 packages/core/src/index.ts 抽取
icon: ${def.icon}
---

{/* 本页由 scripts/generate-api-types.ts 在构建期生成，不要手改。 */}

<Callout type="info">
  本页 ${symbols.length} 个符号由 \`packages/core/src/index.ts\` 的导出面在构建期生成，
  签名、参数表与源码位置都取自 TypeScript 编译器对源码的解析。全部导出的索引见
  [类型索引](${URL_BASE})，同一批能力的 SDK 与 HTTP 形态见
  [SDK 方法页](${SDK_URL}) 与 [HTTP 端点参考](${HTTP_URL})。
</Callout>

`
  await writeFile(join(OUT, `${def.id}.mdx`), `${header}${renderPage(symbols)}\n`, 'utf8')
}

const index = PAGES.find((def) => def.id === 'index')
if (!index) throw new Error('PAGES 里没有 index —— 索引页是「搜索搜得到」的落点，不能没有')
await writeFile(join(OUT, 'index.mdx'), indexPage(byPage), 'utf8')
await writeFile(
  join(OUT, 'meta.json'),
  `${JSON.stringify({ title: '类型参考', icon: 'FileCode', pages: PAGES.map((def) => def.id) }, null, 2)}\n`,
  'utf8'
)

console.log(`已生成类型参考：${OUT}（${PAGES.length} 页 / ${data.children.length} 个符号）`)
