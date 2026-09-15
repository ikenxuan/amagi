/**
 * 两条生成入口里最简单的那条：N 份样本 → 一个类型。
 *
 * 单独一个文件（而不是留在 `index.ts`）是为了避免环：`plan.ts` 要用它，
 * 而 `index.ts` 又要 re-export `plan.ts` —— 放在 `index.ts` 里就成了
 * `index → plan → index`，`pnpm deps:check`（dpdm，circular:1）会红。
 */

import { mergeSamples } from './merge'
import type { MergeOptions, RenderOptions } from './options'
import { renderShape, type RenderResult } from './render'
import type { MergeReport } from './report'
import type { JsonValue, Shape } from './types'

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
