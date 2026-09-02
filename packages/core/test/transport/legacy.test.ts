import { fetchData, fetchResponse, isNetworkErrorResult } from 'amagi/transport/legacy'
/**
 * transport/legacy 的契约（阶段 6 从 test/model/networks.test.ts 搬来）。
 *
 * `fetchData` / `fetchResponse` / `isNetworkErrorResult` 是顶层保留导出
 * （06-migration「保留且形状不变」），行为逐字保持 v6 —— 包括三条当年被
 * 标成 KNOWN-DEFECT 的历史语义：4xx/5xx 被当作成功放行、只清理大写
 * `User-Agent`、浅拷贝就改写调用方 headers。这些行为**只存在于本 legacy
 * 入口**；v7 主路径（HttpClient + 执行管线）分别修掉了它们，修复的断言
 * 在 transport / endpoints 测试里。v8 随 compat 一起移除。
 */
import { describe, expect, it, vi } from 'vitest'

import { constantAdapter, failingAdapter } from '../helpers/adapter'

describe('fetchData - 正常路径', () => {
  it('返回响应 body，请求配置透传', async () => {
    const h = constantAdapter({ v: 1 })
    const result = await fetchData({ url: 'https://example.com/a', adapter: h.adapter })

    expect(result).toEqual({ v: 1 })
    expect(h.last().url).toBe('https://example.com/a')
  })
})

describe('fetchData - HTTP 状态码（legacy 语义：非 2xx 也返回 body）', () => {
  it.each([400, 401, 403, 404, 412, 429, 500, 503])('HTTP %i 返回 body（validateStatus 放行，仅本 legacy 入口）', async (status) => {
    const h = constantAdapter({ code: status }, status)
    const result = await fetchData({ url: 'https://example.com/a', adapter: h.adapter })

    expect(result).toEqual({ code: status })
  })
})

describe('fetchData - 重试', () => {
  const RECOVERABLE = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'ENETUNREACH', 'EHOSTUNREACH', 'EPIPE', 'EAI_AGAIN', 'ECONNABORTED']

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
    spy.mockRestore()

    expect(delays).toEqual([1000, 2000, 4000])
  })
})

describe('fetchData - User-Agent 清理（legacy 语义：只认大写 User-Agent）', () => {
  it('大写 User-Agent 里的 Edg 标识被剥掉', async () => {
    const h = constantAdapter({ ok: 1 })
    await fetchData({ url: 'https://example.com/a', headers: { 'User-Agent': 'Mozilla/5.0 Chrome/141 Edg/141.0.0.0' }, adapter: h.adapter })

    expect(h.last().headers['User-Agent']).toBe('Mozilla/5.0 Chrome/141')
  })

  it('小写 user-agent 不被清理（仅本 legacy 入口；v7 的 transport 出口已修）', async () => {
    const h = constantAdapter({ ok: 1 })
    await fetchData({ url: 'https://example.com/a', headers: { 'user-agent': 'Mozilla/5.0 Chrome/141 Edg/141.0.0.0' }, adapter: h.adapter })

    expect(h.last().headers['user-agent']).toContain('Edg')
  })
})

describe('fetchResponse', () => {
  it('返回完整响应（含 headers）', async () => {
    const h = constantAdapter({ v: 1 })
    const result = await fetchResponse({ url: 'https://example.com/a', adapter: h.adapter })

    expect(result).toHaveProperty('data', { v: 1 })
    expect(result).toHaveProperty('headers')
    expect(result).toHaveProperty('status', 200)
  })

  it('底层不可恢复错误返回 v6 ErrorResult', async () => {
    const h = failingAdapter('ERR_BAD_REQUEST', 99)
    const result = await fetchResponse({ url: 'https://example.com/a', adapter: h.adapter }, 0)

    expect(isNetworkErrorResult(result)).toBe(true)
  })
})

describe('isNetworkErrorResult - 判别边界（v6 + v7 双语义）', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['字符串', 'error'],
    ['数字', 500],
    ['空对象', {}],
    ['数组', []],
    ['只有 success:false', { success: false }],
    ['error 为 null', { success: false, error: null }],
    ['error 无 amagiError 也无 kind', { success: false, error: { code: 1 } }],
    ['success:true 且有 amagiError', { success: true, error: { amagiError: {} } }]
  ])('%s 判为 false', (_label, input) => {
    expect(isNetworkErrorResult(input)).toBe(false)
  })

  it('success:false 且 error.amagiError 存在（v6 legacy 信封）判为 true', () => {
    expect(isNetworkErrorResult({ success: false, error: { amagiError: { errorDescription: 'x' } } })).toBe(true)
  })

  it('success:false 且 error.kind === network（v7 失败信封）判为 true', () => {
    expect(isNetworkErrorResult({ success: false, error: { kind: 'network', code: 'NETWORK_ERROR' } })).toBe(true)
  })
})
