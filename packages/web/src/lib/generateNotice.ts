/**
 * 「生成类型」回来之后要说的话 —— 摘要进 toast，全文可复制。
 *
 * ## 为什么要单独一层
 *
 * 原先 `App.tsx` 把 `warnings.join('；')` 整段塞进 toast 的 description —— 抖音 `parseWork`
 * 那种 18 条告警的端点，一条 toast 就是一整屏，点一次「生成类型」叠一条，而**同一组告警
 * 连点几次就原样叠几条**（没有任何去重）。这一层把三件事收口成纯函数（可测，
 * 同 `storeNotice.ts` 那条先例）：
 *
 * 1. **同一端点的生成收据去重**：连点不再一屏一屏地叠，关掉旧的再来新的（`GENERATE_TOAST_KEY`）。
 * 2. **toast 里只有摘要**：`N 条要你看一眼（空数组 ×a、大整数 ID ×b、其它 ×c），点「复制详情」看全部`。
 *    长文不再溢出屏幕。
 * 3. **全文一键复制**：`GenerateResult` 的完整内容（写出的文件、清理的残留、全部告警、note）
 *    都在剪贴板里 —— toast 会走，而「修哪几处」是要照着改的东西。
 */

import type { GenerateResult } from '../../shared/contract'

/** 同一端点的生成收据只留一条 —— 连点「生成类型」不再一屏一屏地叠 */
export const GENERATE_TOAST_KEY = 'generate-receipt'

/** 摘要里按类分桶（`空数组 ×12` / `大整数 ID ×6`）：18 条告警压缩成一行数 */
export interface GenerateWarningSummary {
  emptyArrays: number
  unsafeIntegers: number
  others: number
}

/** 告警按类分桶。只按**文案特征**数，不解析路径 —— 文案是产侧（typegen）的事 */
export const summarizeWarnings = (warnings: readonly string[]): GenerateWarningSummary => ({
  emptyArrays: warnings.filter((warning) => warning.includes('全是空的')).length,
  unsafeIntegers: warnings.filter((warning) => warning.includes('MAX_SAFE_INTEGER')).length,
  others: warnings.filter((warning) => !warning.includes('全是空的') && !warning.includes('MAX_SAFE_INTEGER')).length
})

/** toast 里那一行摘要。一条都没有时不该被调（调用方判） */
export const warningSummaryLine = (warnings: readonly string[]): string => {
  const summary = summarizeWarnings(warnings)
  const parts: string[] = []
  if (summary.emptyArrays > 0) parts.push(`空数组 ×${summary.emptyArrays}`)
  if (summary.unsafeIntegers > 0) parts.push(`大整数 ID ×${summary.unsafeIntegers}`)
  if (summary.others > 0) parts.push(`其它 ×${summary.others}`)
  return `${warnings.length} 条要你看一眼（${parts.join('、')}），点「复制详情」看全部`
}

/** 「复制详情」复制出去的正文：`GenerateResult` 的**全部**内容，一行一条，不受 toast 限制 */
export const generateCopyText = (result: GenerateResult): string => {
  const lines: string[] = []
  if (result.written.length > 0) lines.push(`写出 ${result.written.length} 个文件：${result.written.join('、')}`)
  if (result.removed.length > 0) lines.push(`清理了 ${result.removed.length} 个残留产物：${result.removed.join('、')}`)
  lines.push(...result.summary)
  if (result.warnings.length > 0) lines.push('要你看一眼：', ...result.warnings.map((warning) => `- ${warning}`))
  lines.push(result.note)
  return lines.join('\n')
}
