import type { ErrorKind } from 'amagi/contracts/error'
import { ERROR_KINDS, isRetryableKind, verdictFromHttpStatus, verdictFromNonJsonBody } from 'amagi/contracts/error'
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

/**
 * 判定的两条公共前置。
 *
 * 四个平台的 judge 都靠它们兜底「响应体不是 JSON」与「HTTP 状态说了失败」
 * 这两种情况 —— 在此之前前者被判成成功、后者根本没人看。
 */
describe('verdictFromNonJsonBody', () => {
  it('非空字符串判 risk / ANTIBOT_PAGE 且可重试', () => {
    const verdict = verdictFromNonJsonBody('Blocked by ArgusSecurityPlugin Uifid Not Found')
    expect(verdict).toEqual({ ok: false, kind: 'risk', code: 'ANTIBOT_PAGE', retryable: true })
  })

  it('空字符串不表态：各平台含义不同（多为 cookie 失效），留给平台判', () => {
    expect(verdictFromNonJsonBody('')).toBeUndefined()
    expect(verdictFromNonJsonBody('   ')).toBeUndefined()
  })

  it('对象 / null / undefined / 数字都不表态', () => {
    expect(verdictFromNonJsonBody({ code: 0 })).toBeUndefined()
    expect(verdictFromNonJsonBody(null)).toBeUndefined()
    expect(verdictFromNonJsonBody(undefined)).toBeUndefined()
    expect(verdictFromNonJsonBody(0)).toBeUndefined()
  })
})

describe('verdictFromHttpStatus', () => {
  it('2xx 不表态', () => {
    for (const status of [200, 201, 204, 299]) {
      expect(verdictFromHttpStatus(status)).toBeUndefined()
    }
  })

  it('逐个状态码的归类', () => {
    expect(verdictFromHttpStatus(401)).toEqual({ ok: false, kind: 'auth', code: 'LOGIN_REQUIRED', retryable: false })
    // 403：四个平台都用它做 WAF 拦截，「这份内容你看不到」走的是 200 + 业务码
    expect(verdictFromHttpStatus(403)).toEqual({ ok: false, kind: 'risk', code: 'RISK_CONTROL', retryable: true })
    expect(verdictFromHttpStatus(404)).toEqual({ ok: false, kind: 'not_found', code: 'NOT_FOUND', retryable: false })
    expect(verdictFromHttpStatus(408)).toEqual({ ok: false, kind: 'timeout', code: 'TIMEOUT', retryable: true })
    expect(verdictFromHttpStatus(429)).toEqual({ ok: false, kind: 'rate_limit', code: 'RATE_LIMITED', retryable: true })
  })

  it('5xx 一律 unavailable / PLATFORM_UNAVAILABLE', () => {
    for (const status of [500, 502, 503, 504]) {
      expect(verdictFromHttpStatus(status)).toMatchObject({ kind: 'unavailable', code: 'PLATFORM_UNAVAILABLE' })
    }
  })

  it('其余非 2xx 落 unknown / PLATFORM_ERROR', () => {
    expect(verdictFromHttpStatus(302)).toMatchObject({ kind: 'unknown', code: 'PLATFORM_ERROR' })
    expect(verdictFromHttpStatus(418)).toMatchObject({ kind: 'unknown', code: 'PLATFORM_ERROR' })
  })

  it('给出的 retryable 与 kind 的默认推导一致', () => {
    for (const status of [401, 403, 404, 408, 429, 500, 418]) {
      const verdict = verdictFromHttpStatus(status)!
      expect(verdict.retryable).toBe(isRetryableKind(verdict.kind!))
    }
  })
})
