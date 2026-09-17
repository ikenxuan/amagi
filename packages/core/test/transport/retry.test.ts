import {
  backoffDelayMs,
  decideRetry,
  DEFAULT_MAX_RETRIES,
  isRecoverableErrno,
  isRetryableStatus,
  RECOVERABLE_ERROR_CODES,
  retryReasonCode,
  RETRY_DELAY_BASE_MS
} from 'amagi/transport/retry'
/**
 * transport/retry 的契约。
 *
 * 退避的数值与节奏必须与 v6 一致（1s / 2s / 4s、默认 3 次），改动它等于
 * 改变对平台的重试压力。v7 新增的只有「429 与 5xx 也退避」——v6 因为给 axios
 * 传了 validateStatus: () => true，这两类根本不抛错，于是从不重试。
 */
import { describe, expect, it } from 'vitest'

describe('transport/retry - 常量与 v6 对齐', () => {
  it('可恢复 errno 清单与 v6 逐字一致', () => {
    expect(RECOVERABLE_ERROR_CODES).toEqual([
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ENETUNREACH',
      'EHOSTUNREACH',
      'EPIPE',
      'EAI_AGAIN',
      'ECONNABORTED'
    ])
  })

  it('默认最大重试 3 次、退避基数 1000ms', () => {
    expect(DEFAULT_MAX_RETRIES).toBe(3)
    expect(RETRY_DELAY_BASE_MS).toBe(1000)
  })
})

describe('transport/retry - 1s / 2s / 4s 指数退避', () => {
  it('前三次失败依次等 1s / 2s / 4s', () => {
    expect(backoffDelayMs(1)).toBe(1000)
    expect(backoffDelayMs(2)).toBe(2000)
    expect(backoffDelayMs(3)).toBe(4000)
  })

  it('继续指数增长', () => {
    expect(backoffDelayMs(4)).toBe(8000)
    expect(backoffDelayMs(5)).toBe(16000)
  })

  it('attempt 小于 1 时不产生负指数', () => {
    expect(backoffDelayMs(0)).toBe(1000)
    expect(backoffDelayMs(-3)).toBe(1000)
  })

  it('可自定义退避基数', () => {
    expect(backoffDelayMs(1, 250)).toBe(250)
    expect(backoffDelayMs(3, 250)).toBe(1000)
  })

  it('decideRetry 给出的 delayMs 就是这条曲线', () => {
    const delays = [1, 2, 3].map((attempt) => {
      const d = decideRetry({ attempt, errno: 'ECONNRESET' })
      return d.retry ? d.delayMs : null
    })
    expect(delays).toEqual([1000, 2000, 4000])
  })
})

describe('transport/retry - 可恢复错误重试', () => {
  it.each(RECOVERABLE_ERROR_CODES)('%s 属于可恢复错误', (errno) => {
    expect(isRecoverableErrno(errno)).toBe(true)
    expect(decideRetry({ attempt: 1, errno }).retry).toBe(true)
  })

  it('429 与 5xx 也退避（v6 从不重试这两类）', () => {
    for (const status of [429, 500, 502, 503, 504, 599]) {
      expect(isRetryableStatus(status)).toBe(true)
      expect(decideRetry({ attempt: 1, status }).retry).toBe(true)
    }
  })
})

describe('transport/retry - 不可恢复错误不重试', () => {
  it.each(['ERR_BAD_REQUEST', 'ERR_CANCELED', 'ENOENT', 'UNKNOWN', ''])('errno %s 不重试', (errno) => {
    expect(isRecoverableErrno(errno)).toBe(false)
    expect(decideRetry({ attempt: 1, errno })).toEqual({ retry: false })
  })

  it('errno 缺失且状态码不可重试时不重试', () => {
    expect(isRecoverableErrno(undefined)).toBe(false)
    expect(decideRetry({ attempt: 1 })).toEqual({ retry: false })
  })

  it.each([200, 204, 301, 400, 401, 403, 404, 412, 418])('HTTP %i 不重试', (status) => {
    expect(isRetryableStatus(status)).toBe(false)
    expect(decideRetry({ attempt: 1, status })).toEqual({ retry: false })
  })

  it('可恢复 errno 与不可重试状态码同时出现时，errno 说了算', () => {
    expect(decideRetry({ attempt: 1, errno: 'ECONNRESET', status: 404 }).retry).toBe(true)
  })
})

describe('transport/retry - maxRetries 边界', () => {
  it('maxRetries: 0 一次都不重试', () => {
    expect(decideRetry({ attempt: 1, errno: 'ECONNRESET', policy: { maxRetries: 0 } })).toEqual({ retry: false })
    expect(decideRetry({ attempt: 1, status: 429, policy: { maxRetries: 0 } })).toEqual({ retry: false })
  })

  it('默认 maxRetries 下，第 1~3 次失败重试，第 4 次不再重试（总共 4 个请求）', () => {
    expect(decideRetry({ attempt: 1, errno: 'ECONNRESET' }).retry).toBe(true)
    expect(decideRetry({ attempt: 2, errno: 'ECONNRESET' }).retry).toBe(true)
    expect(decideRetry({ attempt: 3, errno: 'ECONNRESET' }).retry).toBe(true)
    expect(decideRetry({ attempt: 4, errno: 'ECONNRESET' })).toEqual({ retry: false })
  })

  it('maxRetries: 1 只重试一次', () => {
    expect(decideRetry({ attempt: 1, errno: 'ECONNRESET', policy: { maxRetries: 1 } }).retry).toBe(true)
    expect(decideRetry({ attempt: 2, errno: 'ECONNRESET', policy: { maxRetries: 1 } })).toEqual({ retry: false })
  })
})

describe('transport/retry - retryOf 的错误码归因', () => {
  it('ETIMEDOUT 归为 TIMEOUT', () => {
    expect(retryReasonCode({ errno: 'ETIMEDOUT' })).toBe('TIMEOUT')
  })

  it('其余可恢复 errno 归为 NETWORK_ERROR', () => {
    expect(retryReasonCode({ errno: 'ECONNRESET' })).toBe('NETWORK_ERROR')
    expect(retryReasonCode({ errno: 'EAI_AGAIN' })).toBe('NETWORK_ERROR')
  })

  it('429 归为 RATE_LIMITED，5xx 归为 PLATFORM_UNAVAILABLE', () => {
    expect(retryReasonCode({ status: 429 })).toBe('RATE_LIMITED')
    expect(retryReasonCode({ status: 503 })).toBe('PLATFORM_UNAVAILABLE')
  })

  it('decideRetry 把归因带在 reason 上，供 trace 的 retryOf 使用', () => {
    const d = decideRetry({ attempt: 1, status: 429 })
    expect(d.retry && d.reason).toBe('RATE_LIMITED')
  })
})
