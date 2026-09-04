/**
 * `@ikenxuan/amagi-typegen` —— 响应类型自动化里**纯函数的那一半**。
 *
 * 见 `RESPONSE-TYPE-AUTOGEN-PRD.md` 四的那张图：录制器（有网络、非确定、偶尔手动跑）
 * 与生成器（纯函数、确定、CI 可跑）分开。本包只有生成器这半边，而且**不读文件、不发请求、不落盘**：
 * 「样本 → 形状树 → TypeScript 源码字符串」以及「样本 → 判别联合的一整套文件内容」为止。
 * 落盘那层将来照 `packages/core/scripts/gen-openapi.mts` 的契约写（生成逻辑在 src、
 * 脚本只负责写、`--check` 与已提交产物比对并置 `process.exitCode = 1`、行尾归一）。
 *
 * 两条入口，按要不要判别联合选：
 * 1. `generateTypes` —— N 份样本合成**一个**类型（合并规则见 PRD 五那张表）；
 * 2. `emitDiscriminatedUnion` —— 先做 PRD 5.1 判别式发现，按取值分组、每组各自合并，
 *    产出 `<Endpoint>/<判别式字面量>/<判别式字面量>_V<n>.ts` + barrel + `is*` 类型守卫 + 覆盖率报告。
 *    守卫是必须品不是锦上添花：core 的 `test/types/discriminant-narrowing.test-d.ts` 实测出
 *    「嵌套判别式的 `if` 不收窄、类型谓词能收窄」。
 *
 * 还没做的部分如实写在 `report.ts` 的 `NOT_IMPLEMENTED` 里，随每份报告一起返回。
 */

import { mergeSamples } from './merge'
import type { MergeOptions, RenderOptions } from './options'
import { renderShape, type RenderResult } from './render'
import type { MergeReport } from './report'
import type { JsonValue, Shape } from './types'

export {
  buildCoverage,
  type BuildCoverageInput,
  DEFAULT_KEY_PATH_DEPTH,
  DEFAULT_MAX_DISCRIMINANT_VALUES,
  DEFAULT_MIN_SHAPE_WITNESSES,
  describeDiscriminant,
  type DiscriminantCandidate,
  type DiscriminantCoverage,
  type DiscriminantValue,
  type DiscriminantValueCoverage,
  type DriftRecord,
  findDiscriminants,
  type FindDiscriminantsOptions,
  groupSamplesByDiscriminant,
  type GroupSamplesResult,
  pickDiscriminant,
  readLiteralAtPath,
  type SampleGroup,
  type ShapeCluster,
  type ShapeSplit,
  splitShapes,
  type SplitShapesOptions
} from './discriminant'
export {
  emitDiscriminatedUnion,
  type EmitOptions,
  type EmitResult,
  type EmittedMember,
  type EmittedShape,
  fileNameFromLiteral,
  typeNameFromLiteral
} from './emit'
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
