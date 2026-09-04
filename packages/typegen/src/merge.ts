/**
 * 样本 → 形状树。**纯函数**：不碰网络、不碰文件系统，输入是已经 `JSON.parse` 好的值。
 *
 * 这一层只做一件事 —— 把证据累加进树里，一个类型决策都不做。所有「必需还是可选」、
 * 「要不要联合」、「要不要放宽」都留到渲染时从计数推。理由见 types.ts 的文件头。
 */

import { childPath, elementPath, matchesLiteralPath, type MergeOptions, type ResolvedMergeOptions, resolveMergeOptions } from './options'
import { collectFindings, type MergeReport, NOT_IMPLEMENTED } from './report'
import type { JsonValue, PrimitiveName, PrimitiveShape, Shape } from './types'

export interface MergeResult {
  /** 合并出来的形状树 */
  shape: Shape
  /** 需要人看的东西都在这里 */
  report: MergeReport
}

/** 报告里留几个超界整数的例子就够了，不用把 corpus 里所有的都攒着 */
const UNSAFE_INTEGER_SAMPLES = 8

const createShape = (narrowLiterals: boolean): Shape => ({
  seen: 0,
  nulls: 0,
  primitives: new Map(),
  object: undefined,
  array: undefined,
  narrowLiterals
})

const createPrimitiveShape = (): PrimitiveShape => ({ seen: 0, literals: new Set(), unsafeIntegers: [] })

/** 取（或建）子节点。收窄开关在建节点时按路径定下来，之后渲染阶段不需要再知道路径 */
const childShape = (props: Map<string, Shape>, key: string, path: string, options: ResolvedMergeOptions): Shape => {
  const existing = props.get(key)
  if (existing) return existing
  const created = createShape(matchesLiteralPath(path, options.literalPaths))
  props.set(key, created)
  return created
}

const observePrimitive = (shape: Shape, value: string | number | boolean, options: ResolvedMergeOptions): void => {
  const name = typeof value as PrimitiveName
  let primitive = shape.primitives.get(name)
  if (!primitive) {
    primitive = createPrimitiveShape()
    shape.primitives.set(name, primitive)
  }
  primitive.seen += 1
  if (primitive.literals) {
    primitive.literals.add(value)
    // 取值太多就放弃收集：这种位置不可能收窄成字面量联合，攒着只是白占内存
    if (primitive.literals.size > options.maxLiterals) primitive.literals = undefined
  }
  // 超界整数：精度在 JSON.parse 时就丢了，这里只能记下来当报告项，见 report.ts
  if (
    name === 'number' &&
    Number.isInteger(value) &&
    Math.abs(value as number) > Number.MAX_SAFE_INTEGER &&
    primitive.unsafeIntegers.length < UNSAFE_INTEGER_SAMPLES &&
    !primitive.unsafeIntegers.includes(value as number)
  ) {
    primitive.unsafeIntegers.push(value as number)
  }
}

const observe = (shape: Shape, value: JsonValue, path: string, options: ResolvedMergeOptions): void => {
  shape.seen += 1
  // **两个维度的分界线就在这一行**：值为 null 记进 nulls，键缺失体现为子节点的 seen
  // 小于父对象的 seen。JSON 本身分不出这两件事，合并时一偷懒就会并成一个
  // `T | undefined`，那就把「平台明确返回 null」和「平台没给这个键」搞成同一件事了。
  if (value === null) {
    shape.nulls += 1
    return
  }
  if (Array.isArray(value)) {
    const array = (shape.array ??= {
      seen: 0,
      empty: 0,
      element: createShape(matchesLiteralPath(elementPath(path), options.literalPaths))
    })
    array.seen += 1
    // 空数组提供不了元素形状；元素形状从其它样本补，全空则渲染成 unknown[]
    if (value.length === 0) {
      array.empty += 1
      return
    }
    for (const item of value) observe(array.element, item, elementPath(path), options)
    return
  }
  if (typeof value === 'object') {
    const object = (shape.object ??= { seen: 0, props: new Map() })
    object.seen += 1
    for (const key of Object.keys(value)) {
      const item = (value as { [key: string]: JsonValue })[key]
      // undefined 不是 JSON 值。真喂进来（调用方给的是 JS 对象而非 JSON.parse 结果）
      // 就按「这个键不存在」处理 —— 当成一个值记进去会凭空多出一个类型成员
      if (item === undefined) continue
      const itemPath = childPath(path, key)
      observe(childShape(object.props, key, itemPath, options), item, itemPath, options)
    }
    return
  }
  observePrimitive(shape, value, options)
}

/** 把 N 份样本合并成一棵形状树，顺带产出报告 */
export const mergeSamples = (samples: readonly JsonValue[], options: MergeOptions = {}): MergeResult => {
  const resolved = resolveMergeOptions(options)
  const shape = createShape(matchesLiteralPath('', resolved.literalPaths))
  for (const sample of samples) observe(shape, sample, '', resolved)
  return {
    shape,
    report: {
      sampleCount: samples.length,
      findings: collectFindings(shape),
      notImplemented: NOT_IMPLEMENTED
    }
  }
}
