/**
 * 「生成类型」回来之后要说的话 —— `lib/generateNotice.ts` 的纯判据。
 *
 * 三件要钉住的事（每件都对着一个真实事故）：
 *
 * 1. **同一端点的收据去重** —— 原先连点几次「生成类型」就原样叠几条 toast，
 *    而抖音 `parseWork` 那种 18 条告警的端点，一条就是一整屏。
 * 2. **toast 里只有摘要** —— `warnings.join('；')` 曾经把 18 条长句整段塞进 description，
 *    直接溢出屏幕。现在压成一行数（空数组 ×a / 大整数 ID ×b / 其它 ×c）。
 * 3. **全文一键复制** —— toast 会走，而「修哪几处」是要照着改的东西。
 *
 * 接线（`toast.close(GENERATE_TOAST_KEY)` 真的被调了）在 `App.tsx` 源码上读，
 * 与 `appStore.test.ts` 最后那个 describe 同一条做法。
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import type { GenerateResult } from '../shared/contract'
import { GENERATE_TOAST_KEY, generateCopyText, summarizeWarnings, warningSummaryLine } from '../src/lib/generateNotice'

/** 抖音 `parseWork` 那次事故的真实形状：12 条空数组 + 6 条大整数 ID */
const WARNINGS = [
  ...Array.from(
    { length: 12 },
    (_, i) => `douyin/parseWork：path_${i} —— path_${i} 见过的 1 个数组全是空的，元素类型只能给 unknown —— 需要补样本`
  ),
  ...Array.from(
    { length: 6 },
    (_, i) =>
      `douyin/parseWork：id_${i} —— id_${i} 出现超过 Number.MAX_SAFE_INTEGER 的整数（如 7536022962794038000）。精度在 JSON.parse 时就已经丢了，生成器不做静默处理 —— 需要人决策`
  )
]

const result = (overrides: Partial<GenerateResult> = {}): GenerateResult => ({
  written: ['douyin/ParseWork/ParseWork_V0.ts', 'douyin/ParseWork/index.ts'],
  removed: [],
  storedSamples: [],
  warnings: WARNINGS,
  summary: ['douyin/parseWork：单类型，69 个类型 / 2 份样本'],
  note: 'barrel（根与平台两层）的完整性只有全量 `pnpm gen:types` 能保证 —— 这个动作只碰这一个端点的目录',
  ...overrides
})

describe('告警按类分桶', () => {
  it('空数组 / 大整数 ID / 其它各归各的数', () => {
    expect(summarizeWarnings(WARNINGS)).toEqual({ emptyArrays: 12, unsafeIntegers: 6, others: 0 })
  })

  it('分不出来的那一档也有数 —— 不许静默丢掉', () => {
    expect(summarizeWarnings(['样本读不了：bad.json', '注释孤立：x'])).toEqual({ emptyArrays: 0, unsafeIntegers: 0, others: 2 })
  })
})

describe('toast 里只有一行摘要', () => {
  it('18 条压成一行数，没有一句原话进来', () => {
    const line = warningSummaryLine(WARNINGS)
    expect(line).toBe('18 条要你看一眼（空数组 ×12、大整数 ID ×6），点「复制详情」看全部')
    expect(line).not.toContain('MAX_SAFE_INTEGER')
    expect(line.length).toBeLessThan(80)
  })

  it('只有其它那一档时摘要也完整', () => {
    expect(warningSummaryLine(['样本读不了：bad.json'])).toBe('1 条要你看一眼（其它 ×1），点「复制详情」看全部')
  })
})

describe('「复制详情」给全部内容，一行一条', () => {
  it('写出的文件、summary、全部 18 条告警、note 一个都不少', () => {
    const text = generateCopyText(result())
    expect(text).toContain('ParseWork_V0.ts')
    expect(text).toContain('douyin/parseWork：单类型，69 个类型 / 2 份样本')
    expect(text.match(/^- /gm)).toHaveLength(18)
    expect(text).toContain('MAX_SAFE_INTEGER')
    expect(text).toContain('barrel（根与平台两层）的完整性只有全量')
  })

  it('有清理残留时它也在（布局翻转那次清掉的旧文件）', () => {
    expect(generateCopyText(result({ removed: ['douyin/ParseWork/旧文件.ts'] }))).toContain('旧文件.ts')
  })
})

describe('真的接进了 `App.tsx`', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

  it('**同一端点的收据去重**：新 toast 之前先关掉旧的那条', () => {
    expect(GENERATE_TOAST_KEY).toBe('generate-receipt')
    expect(app).toContain('toast.close(GENERATE_TOAST_KEY)')
  })

  it('**告警不再整段进 toast**：join 那句没了，摘要从 `warningSummaryLine` 来', () => {
    expect(app).not.toContain('warnings.join')
    expect(app).toContain('warningSummaryLine(result.warnings)')
  })

  it('有告警时 toast 上挂着「复制详情」，全文从 `generateCopyText` 来', () => {
    expect(app).toContain("children: '复制详情'")
    expect(app).toContain('generateCopyText(result)')
  })
})
