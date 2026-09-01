import { fetchData, getHeadersAndData, isNetworkErrorResult } from 'amagi/model/networks'
import { describe, expect, it, vi } from 'vitest'

import { constantAdapter, failingAdapter, sequenceAdapter, throwingAdapter } from '../helpers/adapter'

const UA_WITH_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0'

describe('fetchData - 正常路径', () => {
  it('返回 response.data 而非整个 response', async () => {
    const h = constantAdapter({ hello: 'world' })
    const result = await fetchData({ url: 'https://example.com/a', adapter: h.adapter })

    expect(result).toEqual({ hello: 'world' })
    expect(h.count).toBe(1)
  })

  it('原样透传调用方给的 method / headers / timeout', async () => {
    const h = constantAdapter({ ok: 1 })
    await fetchData({
      url: 'https://example.com/a',
      method: 'POST',
      timeout: 1234,
      headers: { 'X-Custom': 'v' },
      adapter: h.adapter
    })

    expect(h.last().method).toBe('post')
    expect(h.last().headers['X-Custom']).toBe('v')
  })

  it.each([
    ['空字符串', ''],
    ['null', null],
    ['数字 0', 0],
    ['false', false],
    ['空数组', []],
    ['空对象', {}]
  ])('原样返回 falsy / 空响应体：%s', async (_label, body) => {
    const h = constantAdapter(body)
    await expect(fetchData({ url: 'https://example.com/a', adapter: h.adapter })).resolves.toEqual(body)
  })
})

describe('fetchData - HTTP 状态码处理', () => {
  it.each([400, 401, 403, 404, 412, 429, 500, 503])('KNOWN-DEFECT: HTTP %i 被当作成功并返回 body', async (status) => {
    const h = constantAdapter({ blocked: true }, status)
    const result = await fetchData({ url: 'https://example.com/a', adapter: h.adapter })

    expect(isNetworkErrorResult(result)).toBe(false)
    expect(result).toEqual({ blocked: true })
    expect(h.count).toBe(1)
  })
})

describe('fetchData - 重试', () => {
  const RECOVERABLE = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ENETUNREACH',
    'EHOSTUNREACH',
    'EPIPE',
    'EAI_AGAIN',
    'ECONNABORTED'
  ]

  it.each(RECOVERABLE)('%s 属于可恢复错误，重试后成功', async (code) => {
    vi.useFakeTimers()
    try {
      const h = failingAdapter(code, 2, { recovered: true })
      const p = fetchData({ url: 'https://example.com/a', adapter: h.adapter }, 3)
      await vi.runAllTimersAsync()
      await expect(p).resolves.toEqual({ recovered: true })
      expect(h.count).toBe(3)
    } finally {
      vi.useRealTimers()
    }
  })

  it.each(['ERR_BAD_REQUEST', 'ERR_BAD_RESPONSE', 'ECANCELED', 'UNKNOWN_CODE'])('%s 不可恢复，立即返回错误且只请求一次', async (code) => {
    const h = failingAdapter(code, 99)
    const result = await fetchData({ url: 'https://example.com/a', adapter: h.adapter }, 3)

    expect(h.count).toBe(1)
    expect(isNetworkErrorResult(result)).toBe(true)
  })

  it('退避为 1s / 2s / 4s 指数递增', async () => {
    const delays: number[] = []
    const spy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number) => {
      delays.push(ms ?? 0)
      fn()
      return 0 as unknown as ReturnType<typeof setTimeout>
    }) as unknown as typeof setTimeout)

    const h = failingAdapter('ECONNRESET', 3, { ok: 1 })
    await fetchData({ url: 'https://example.com/a', adapter: h.adapter }, 3)

    expect(delays).toEqual([1000, 2000, 4000])
    spy.mockRestore()
  })

  it('重试次数用尽后返回 ErrorResult，且携带已重试次数', async () => {
    vi.useFakeTimers()
    try {
      const h = failingAdapter('ECONNRESET', 99)
      const p = fetchData({ url: 'https://example.com/boom', adapter: h.adapter }, 2)
      await vi.runAllTimersAsync()
      const result = await p

      expect(h.count).toBe(3)
      expect(isNetworkErrorResult(result)).toBe(true)
      const err = result as { success: false; code: number; message: string; error: any }
      expect(err.success).toBe(false)
      expect(err.code).toBe(500)
      expect(err.message).toContain('ECONNRESET')
      expect(err.message).toContain('已重试 2 次')
      expect(err.error.amagiError.errorDescription).toContain('已重试 2 次')
      expect(err.error.amagiError.responseCode).toBe('ECONNRESET')
    } finally {
      vi.useRealTimers()
    }
  })

  it('maxRetries = 0 时不重试', async () => {
    const h = failingAdapter('ECONNRESET', 99)
    await fetchData({ url: 'https://example.com/a', adapter: h.adapter }, 0)
    expect(h.count).toBe(1)
  })

  it('非 Axios 错误原样上抛，不被包装成 ErrorResult', async () => {
    const boom = new TypeError('not an axios error')
    const h = throwingAdapter(boom)
    await expect(fetchData({ url: 'https://example.com/a', adapter: h.adapter })).rejects.toThrow(boom)
  })
})

describe('cleanUserAgent - header 大小写', () => {
  it('大写 User-Agent 的 Edg/xxx 标识会被剥离', async () => {
    const h = constantAdapter({ ok: 1 })
    await fetchData({ url: 'https://example.com/a', headers: { 'User-Agent': UA_WITH_EDGE }, adapter: h.adapter })

    expect(h.last().headers['User-Agent']).not.toContain('Edg/')
    expect(h.last().headers['User-Agent']).toContain('Chrome/141.0.0.0 Safari/537.36')
  })

  it('KNOWN-DEFECT: 小写 user-agent 不会被清理（小红书默认配置即为小写）', async () => {
    const h = constantAdapter({ ok: 1 })
    await fetchData({ url: 'https://example.com/a', headers: { 'user-agent': UA_WITH_EDGE }, adapter: h.adapter })

    expect(h.last().headers['user-agent']).toContain('Edg/141.0.0.0')
  })

  it('不含 Edg 标识时保持原样', async () => {
    const ua = 'Mozilla/5.0 Chrome/125.0.0.0 Safari/537.36'
    const h = constantAdapter({ ok: 1 })
    await fetchData({ url: 'https://example.com/a', headers: { 'User-Agent': ua }, adapter: h.adapter })

    expect(h.last().headers['User-Agent']).toBe(ua)
  })

  it('KNOWN-DEFECT: 就地改写了调用方传入的 headers 对象（只做浅拷贝）', async () => {
    const h = constantAdapter({ ok: 1 })
    const headers: Record<string, string> = { 'User-Agent': UA_WITH_EDGE }
    await fetchData({ url: 'https://example.com/a', headers, adapter: h.adapter })

    expect(headers['User-Agent']).not.toContain('Edg/')
  })
})

describe('isNetworkErrorResult - 判别边界', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['字符串', 'error'],
    ['数字', 500],
    ['空对象', {}],
    ['数组', []],
    ['只有 success:false', { success: false }],
    ['error 为 null', { success: false, error: null }],
    ['error 无 amagiError', { success: false, error: { code: 1 } }],
    ['success:true 且有 amagiError', { success: true, error: { amagiError: {} } }]
  ])('%s 判为 false', (_label, input) => {
    expect(isNetworkErrorResult(input)).toBe(false)
  })

  it('success:false 且 error.amagiError 存在则判为 true', () => {
    expect(isNetworkErrorResult({ success: false, error: { amagiError: { errorDescription: 'x' } } })).toBe(true)
  })
})

describe('getHeadersAndData', () => {
  it('返回 headers 与 data', async () => {
    const h = sequenceAdapter([{ v: 1 }])
    const result = await getHeadersAndData({ url: 'https://example.com/a', adapter: h.adapter })

    expect(result).toHaveProperty('data', { v: 1 })
    expect(result).toHaveProperty('headers')
  })

  it('底层失败时把 ErrorResult 原样返回', async () => {
    const h = failingAdapter('ERR_BAD_REQUEST', 99)
    const result = await getHeadersAndData({ url: 'https://example.com/a', adapter: h.adapter }, 0)

    expect(isNetworkErrorResult(result)).toBe(true)
  })
})
