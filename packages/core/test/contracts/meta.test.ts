import type { TraceReason } from 'amagi/contracts/meta'
import { STATIC_CLIENT_ID, TRACE_REASONS } from 'amagi/contracts/meta'
/**
 * contracts/meta 的运行时契约。
 *
 * `TraceReason` 的取值集合是 A4（重试叠乘）诊断的基础：
 * 少一个取值就意味着某类请求在 trace 里无法归因。
 */
import { describe, expect, it } from 'vitest'

describe('contracts/meta - TraceReason', () => {
  it('恰好覆盖 initial | retry | page | segment | prepare 五个取值', () => {
    expect(TRACE_REASONS).toEqual(['initial', 'retry', 'page', 'segment', 'prepare'])
  })

  it('无重复项', () => {
    expect(new Set(TRACE_REASONS).size).toBe(TRACE_REASONS.length)
  })

  it('五个取值分别对应一类请求来源', () => {
    const purpose: Record<TraceReason, string> = {
      initial: '首次请求',
      retry: '重试',
      page: '翻页',
      segment: '分段 / 多请求聚合',
      prepare: '前置请求'
    }
    expect([...TRACE_REASONS].sort()).toEqual(Object.keys(purpose).sort())
  })
})

describe('contracts/meta - STATIC_CLIENT_ID', () => {
  it("静态 fetcher 的 clientId 固定为 'static'", () => {
    expect(STATIC_CLIENT_ID).toBe('static')
  })
})
