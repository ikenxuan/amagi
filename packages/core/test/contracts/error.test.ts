import type { ErrorKind } from 'amagi/contracts/error'
import { ERROR_KINDS, isRetryableKind } from 'amagi/contracts/error'
/**
 * contracts/error 的运行时契约。
 *
 * 重点是 `kind → retryable` 的默认推导：这张表决定了调用方
 * `if (r.error.retryable) scheduleRetry()` 的行为，12 个 kind 逐个钉死。
 */
import { describe, expect, it } from 'vitest'

/** 期望的 kind → retryable 全表。这里刻意逐条写死，不从源码反推 */
const EXPECTED: Record<ErrorKind, boolean> = {
  validation: false,
  auth: false,
  rate_limit: true,
  risk: true,
  not_found: false,
  forbidden: false,
  unavailable: true,
  network: true,
  timeout: true,
  parse: false,
  internal: false,
  unknown: false
}

describe('contracts/error - ErrorKind 清单', () => {
  it('恰好 12 个 kind', () => {
    expect(ERROR_KINDS).toHaveLength(12)
  })

  it('ERROR_KINDS 与声明顺序一致且无重复', () => {
    expect(ERROR_KINDS).toEqual([
      'validation',
      'auth',
      'rate_limit',
      'risk',
      'not_found',
      'forbidden',
      'unavailable',
      'network',
      'timeout',
      'parse',
      'internal',
      'unknown'
    ])
    expect(new Set(ERROR_KINDS).size).toBe(ERROR_KINDS.length)
  })

  it('ERROR_KINDS 与期望表互为覆盖（防止测试表漂移）', () => {
    expect([...ERROR_KINDS].sort()).toEqual(Object.keys(EXPECTED).sort())
  })
})

describe('contracts/error - kind → retryable 默认推导', () => {
  for (const kind of Object.keys(EXPECTED) as ErrorKind[]) {
    it(`${kind} → ${EXPECTED[kind]}`, () => {
      expect(isRetryableKind(kind)).toBe(EXPECTED[kind])
    })
  }

  it('可重试的恰好是 rate_limit / risk / unavailable / network / timeout 五类', () => {
    expect(ERROR_KINDS.filter(isRetryableKind)).toEqual(['rate_limit', 'risk', 'unavailable', 'network', 'timeout'])
  })

  it('不可重试的恰好是其余七类', () => {
    expect(ERROR_KINDS.filter((k) => !isRetryableKind(k))).toEqual([
      'validation',
      'auth',
      'not_found',
      'forbidden',
      'parse',
      'internal',
      'unknown'
    ])
  })
})
