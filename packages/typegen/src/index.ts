/**
 * `@ikenxuan/amagi-typegen` —— 响应类型自动化里**纯函数的那一半**。
 *
 * 见 `RESPONSE-TYPE-AUTOGEN-PRD.md` 四的那张图：录制器（有网络、非确定、偶尔手动跑）
 * 与生成器（纯函数、确定、CI 可跑）分开。本包目前只有生成器这半边，而且只到
 * 「N 份样本 → 形状树 → TypeScript 源码字符串」为止：**不读文件、不发请求、不落盘**。
 * 落盘那层将来照 `packages/core/scripts/gen-openapi.mts` 的契约写（生成逻辑在 src、
 * 脚本只负责写、`--check` 与已提交产物比对并置 `process.exitCode = 1`、行尾归一）。
 *
 * 这一轮**没做**的两件事（别当成做了，见 `NOT_IMPLEMENTED`）：
 * 1. PRD 5.1 判别式发现 —— 现在形状差异一律合并成可选键，不会切判别联合；
 * 2. `is*` 类型守卫生成 —— core 的 `test/types/discriminant-narrowing.test-d.ts` 已经
 *    实测出「嵌套判别式的 `if` 不收窄、类型谓词能收窄」，所以守卫函数是必须品，
 *    但它依赖 1 先落地（得先知道判别字段在哪条路径上）。
 */

import { mergeSamples } from './merge'
import type { MergeOptions, RenderOptions } from './options'
import { renderShape, type RenderResult } from './render'
import type { MergeReport } from './report'
import type { JsonValue, Shape } from './types'

export { mergeSamples, type MergeResult } from './merge'
export { childPath, DEFAULT_MAX_LITERALS, elementPath, GENERATED_BANNER, type MergeOptions, type RenderOptions } from './options'
export { INDEX_SIGNATURE, renderShape, type RenderResult } from './render'
export {
  type EmptyArrayFinding,
  type Finding,
  type LiteralWidenedFinding,
  type MergeReport,
  type MixedPrimitivesFinding,
  NOT_IMPLEMENTED,
  type UnsafeIntegerFinding
} from './report'
export type { ArrayShape, JsonValue, LiteralValue, ObjectShape, PrimitiveName, PrimitiveShape, Shape } from './types'

export interface GenerateOptions extends MergeOptions, RenderOptions {}

export interface GenerateResult extends RenderResult {
  /** 需要人看的东西都在这里（超界整数、被放宽的字面量、全空数组……） */
  report: MergeReport
  /** 中间产物，留给调用方做覆盖率统计 / 调试 */
  shape: Shape
}

/** 一步到底：N 份样本 → TypeScript 源码 + 报告 */
export const generateTypes = (samples: readonly JsonValue[], options: GenerateOptions = {}): GenerateResult => {
  const { shape, report } = mergeSamples(samples, options)
  return { ...renderShape(shape, options), report, shape }
}
