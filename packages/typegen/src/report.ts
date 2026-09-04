/**
 * 合并报告。
 *
 * 存在的理由：规则表里有些情况**生成器自己无权拍板**，比如「这个数字超过了
 * `Number.MAX_SAFE_INTEGER`」。静默挑一种处理（悄悄转成 string、悄悄留 number）
 * 都会埋雷，所以这些情况一律收集成报告项交给人 —— `needsDecision` 就是那个标记。
 */

import { childPath, elementPath, PRIMITIVE_ORDER, sortLiterals } from './options'
import type { LiteralValue, PrimitiveName, Shape } from './types'

interface FindingBase {
  /** 出现位置，路径写法见 options.ts */
  path: string
  /** true = 生成器决定不了，要人看一眼；false = 只是告知 */
  needsDecision: boolean
  /** 可直接打印的中文说明 */
  message: string
}

/** 超过 `Number.MAX_SAFE_INTEGER` 的整数：**精度在 JSON.parse 时就丢了**，只能人决策 */
export interface UnsafeIntegerFinding extends FindingBase {
  kind: 'unsafe-integer'
  /** `JSON.parse` 之后拿到的值（已经是丢完精度的值） */
  observed: number[]
  /** 键名看起来像 ID（`*id` / `*id_str`）—— 只是个提示，不影响是否报告 */
  looksLikeId: boolean
}

/** 恒为同一字面量、已按默认策略放宽成基础类型。要收窄就把路径加进 `literalPaths`。只对枚举 token 形状的常量报，见 `ENUM_TOKEN` */
export interface LiteralWidenedFinding extends FindingBase {
  kind: 'literal-widened'
  literal: LiteralValue
  occurrences: number
}
/** 这个位置见过的数组全是空的 —— 元素类型只能给 `unknown`，得补样本 */
export interface EmptyArrayFinding extends FindingBase {
  kind: 'empty-array'
  arrays: number
}

/** 同一个键在不同样本里是不同原始类型（业务码 `-412` vs `"12061"` 就是这个） */
export interface MixedPrimitivesFinding extends FindingBase {
  kind: 'mixed-primitives'
  types: PrimitiveName[]
}

export type Finding = UnsafeIntegerFinding | LiteralWidenedFinding | EmptyArrayFinding | MixedPrimitivesFinding

/**
 * 这一轮**没做**的部分，随报告一起返回。
 *
 * 写在返回值里而不是只写在文档里，是为了让调用方（将来的 `gen:types` CLI）把它打出来 ——
 * 「哪些还没做」必须每次都撞到人眼睛上，否则下游会按「都做完了」用。
 *
 * PRD 5.1 判别式发现与 `is*` 守卫生成**已经做了**，在 `discriminant.ts` / `emit.ts`
 * （入口 `emitDiscriminatedUnion`）。注意 `mergeSamples` 本身仍然是「N 份样本 → 一棵树」：
 * 它不分组，形状差异一律合并成可选键。要判别联合就走 `emitDiscriminatedUnion`。
 */
export const NOT_IMPLEMENTED: readonly string[] = [
  'PRD 五「数组元素形状不一致 → 能判别就判别联合」的**元素级**那一半：数组里的判别式候选能发现（`insideArray`），但只有不含 `[]` 的判别式能给样本分组。元素级判别联合还没产',
  'PRD 5.1 的**次级判别式子目录**（`<外层取值>/<内层取值>/…`，如 `DYNAMIC_TYPE_FORWARD/Forward/DYNAMIC_TYPE_AV/`）：能检出并报出来（`EmittedMember.nested`），但本轮只产一层',
  'PRD 六 的落盘脚本 `gen:types`：注释 sidecar（`.doc.json` → JSDoc，含孤立 pointer 报告）已经做了，但本包仍然只算出「相对路径 → 源码」—— 写盘、`--check`、行尾归一还没有'
]

export interface MergeReport {
  /** 喂进来多少份样本 */
  sampleCount: number
  /** 按 path、kind 排好序，保证确定性 */
  findings: Finding[]
  /** 见 `NOT_IMPLEMENTED` */
  notImplemented: readonly string[]
}

/** 只用于报告里的提示，不参与任何自动处理 */
const looksLikeIdKey = (path: string): boolean => /id(?:_str)?$/i.test(lastSegment(path))

/**
 * 看起来像枚举 token 的字符串：`DYNAMIC_TYPE_AV`、`AUTHOR_TYPE_NORMAL`、`MAJOR_TYPE_ARCHIVE`。
 *
 * 「恒为同一字面量」这条只在命中这个形状时才报。实测理由：拿那两份假变体样本跑一遍，
 * 不加过滤会刷出 **120 条**「某个字段在 2 份样本里恒为同一个值」—— 只有 2 份样本时几乎
 * 每个字段都恒定，报告直接被淹掉。而真正值得人看一眼的恰好是枚举 token：它们是判别式
 * 候选（5.1 要找的东西），也是唯一「收窄成字面量可能是对的」的一类。
 * 其余常量照规则表默认放宽，不吭声。要看全量就自己遍历返回的 `shape`。
 */
const ENUM_TOKEN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/

const lastSegment = (path: string): string => {
  const segments = path.replace(/\[\]$/, '').split('.')
  return segments[segments.length - 1] ?? ''
}

/** 深度优先遍历形状树，键按字典序 —— 顺序固定，报告才可比对 */
function* walk(shape: Shape, path: string): Generator<[string, Shape]> {
  yield [path, shape]
  if (shape.object) {
    for (const key of [...shape.object.props.keys()].sort()) {
      yield* walk(shape.object.props.get(key)!, childPath(path, key))
    }
  }
  if (shape.array) yield* walk(shape.array.element, elementPath(path))
}

/**
 * 遍历形状树收集报告项。
 *
 * 不需要选项：字面量该不该收窄这件事在读样本时就按路径写进 `Shape.narrowLiterals` 了，
 * 这里只看树本身 —— 少一个参数，也就少一处「两边选项不一致」的可能。
 */
export const collectFindings = (root: Shape): Finding[] => {
  const findings: Finding[] = []
  for (const [path, shape] of walk(root, '')) {
    const shown = path === '' ? '(根)' : path
    for (const name of PRIMITIVE_ORDER) {
      const primitive = shape.primitives.get(name)
      if (!primitive) continue
      if (primitive.unsafeIntegers.length > 0) {
        const observed = [...new Set(primitive.unsafeIntegers)].sort((a, b) => a - b)
        findings.push({
          kind: 'unsafe-integer',
          path,
          needsDecision: true,
          looksLikeId: looksLikeIdKey(path),
          observed,
          message:
            `${shown} 出现超过 Number.MAX_SAFE_INTEGER 的整数（如 ${observed[0]}）。` +
            '精度在 JSON.parse 时就已经丢了，生成器不做静默处理 —— 需要人决策：改成录原始文本、类型声明成 string，还是接受精度损失'
        })
      }
      // 恒为一个取值才谈得上「该不该收窄」（多取值时放宽显然是对的）；
      // 只见过 1 次也谈不上「恒为」，所以要求 seen >= 2；再加 ENUM_TOKEN 过滤去噪
      if (!shape.narrowLiterals && primitive.literals?.size === 1 && primitive.seen >= 2) {
        const literal = sortLiterals(primitive.literals)[0]!
        if (typeof literal === 'string' && ENUM_TOKEN.test(literal)) {
          findings.push({
            kind: 'literal-widened',
            path,
            needsDecision: false,
            literal,
            occurrences: primitive.seen,
            message:
              `${shown} 在 ${primitive.seen} 次取值里恒为 ${JSON.stringify(literal)}（像枚举 token），已按默认策略放宽成 ${name}。` +
              '默认放宽是有意的：单账号采样会让 userId 之类恒等于一个值，收窄成字面量是错的。' +
              '确认该收窄（判别式候选）就把这条路径加进 literalPaths'
          })
        }
      }
    }
    if (shape.array && shape.array.seen > 0 && shape.array.seen === shape.array.empty) {
      findings.push({
        kind: 'empty-array',
        path,
        needsDecision: true,
        arrays: shape.array.seen,
        message: `${shown} 见过的 ${shape.array.seen} 个数组全是空的，元素类型只能给 unknown —— 需要补样本`
      })
    }
    if (shape.primitives.size >= 2) {
      const types = PRIMITIVE_ORDER.filter((name) => shape.primitives.has(name))
      findings.push({
        kind: 'mixed-primitives',
        path,
        needsDecision: false,
        types: [...types],
        message: `${shown} 在不同样本里是不同原始类型（${types.join(' / ')}），已取联合`
      })
    }
  }
  // 同样为了确定性：不用 localeCompare（随 locale 变），按码位比
  return findings.sort((a, b) => {
    if (a.path !== b.path) return a.path < b.path ? -1 : 1
    return a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0
  })
}
