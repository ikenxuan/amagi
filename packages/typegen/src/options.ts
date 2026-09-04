/**
 * 合并 / 渲染的选项与默认值，以及「路径」这个约定。
 *
 * 路径写法（findings 和 `literalPaths` 都用它）：根是空串，对象键用 `.` 连，
 * 数组元素加 `[]`。例如 `data.item.type`、`data.items[].modules.module_author.mid`。
 * 选的是这套而不是 JSON Pointer，因为 `.doc.json` 注释 sidecar（PRD 六）将来也要用
 * 同一套路径去对齐，`.` 形式在文档和报错里都更好读。
 */

import type { LiteralValue, PrimitiveName } from './types'

/** 原始类型在联合里的固定顺序 —— 同样是为了确定性（见 `sortLiterals`） */
export const PRIMITIVE_ORDER: readonly PrimitiveName[] = ['string', 'number', 'boolean']

/** 一个位置最多收集多少个不同字面量，超了就放弃收集（必然放宽成基础类型） */
export const DEFAULT_MAX_LITERALS = 24

export interface MergeOptions {
  /**
   * 字面量收窄白名单。**默认一律放宽**（见 `Shape.narrowLiterals` 的注释），
   * 只有这里命中的路径才把取值收窄成字面量联合。
   *
   * 字符串按整条路径**精确匹配**（`'data.item.type'`），要模糊匹配就给 RegExp
   * （`/\.type$/`）。不做通配符自造语法 —— RegExp 已经够用，少一套语法少一处误解。
   */
  literalPaths?: readonly (string | RegExp)[]
  /** 见 `DEFAULT_MAX_LITERALS` */
  maxLiterals?: number
}

/** 内部用的、已经填好默认值的选项 */
export interface ResolvedMergeOptions {
  literalPaths: readonly (string | RegExp)[]
  maxLiterals: number
}

export const resolveMergeOptions = (options: MergeOptions = {}): ResolvedMergeOptions => ({
  literalPaths: options.literalPaths ?? [],
  maxLiterals: options.maxLiterals ?? DEFAULT_MAX_LITERALS
})

/** 拼子节点路径：根（空串）下的键不带前导点 */
export const childPath = (parent: string, key: string): string => (parent === '' ? key : `${parent}.${key}`)

/** 拼数组元素路径 */
export const elementPath = (parent: string): string => `${parent}[]`

/** 这条路径要不要收窄字面量 */
export const matchesLiteralPath = (path: string, patterns: readonly (string | RegExp)[]): boolean =>
  patterns.some((pattern) => (typeof pattern === 'string' ? pattern === path : pattern.test(path)))

/**
 * 生成文件的文件头。
 *
 * 里面那句 `_V<n>` 的语义是**故意**写进产物的：现状里 `_V0` / `_V1` 看起来像 API 版本号，
 * 实际是「两次抓包结果不一致就再开一个文件」（PRD 1.3）。新语义只有一个意思 ——
 * 同一判别式取值下的形状序号。不把这句话写在人每天看得见的地方，下一个人一定会理解错。
 */
export const GENERATED_BANNER = [
  '// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。',
  '// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。',
  '//',
  '// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：',
  '// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。'
].join('\n')

export interface RenderOptions {
  /** 根类型名 */
  rootName?: string
  /** 文件头；`false` 表示不要（写测试时用）。默认 `GENERATED_BANNER` */
  banner?: string | false
  /** 子类型是否也 export。默认 false —— 照现存手写文件的样子，只导出根类型 */
  exportSubtypes?: boolean
}

export interface ResolvedRenderOptions {
  rootName: string
  banner: string | false
  exportSubtypes: boolean
}

export const resolveRenderOptions = (options: RenderOptions = {}): ResolvedRenderOptions => ({
  rootName: options.rootName ?? 'GeneratedResponse',
  banner: options.banner ?? GENERATED_BANNER,
  exportSubtypes: options.exportSubtypes ?? false
})

/** 渲染字面量：字符串用单引号（仓库 oxfmt 配置 singleQuote），数字/布尔直出 */
export const renderLiteral = (value: LiteralValue): string =>
  typeof value === 'string' ? `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : String(value)

/**
 * 字面量排序。存在的唯一理由是**确定性**：产物要提交进 git 并跑 `--check`，
 * 同一份 corpus 换个读取顺序就不能产出不同的字节。Set 的迭代顺序等于插入顺序，
 * 也就是样本顺序，所以任何要落到源码里的集合都得先排序。
 *
 * 不用 `localeCompare`：它随运行环境的 locale 变，那会让「确定性」在别人机器上失效。
 */
export const sortLiterals = (values: Iterable<LiteralValue>): LiteralValue[] =>
  [...values].sort((a, b) => {
    if (typeof a !== typeof b)
      return PRIMITIVE_ORDER.indexOf(typeof a as PrimitiveName) - PRIMITIVE_ORDER.indexOf(typeof b as PrimitiveName)
    if (typeof a === 'number' && typeof b === 'number') return a - b
    const left = String(a)
    const right = String(b)
    return left < right ? -1 : left > right ? 1 : 0
  })
