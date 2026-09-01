import { TraceCollector } from 'amagi/transport/trace'
/**
 * transport/trace 的契约。
 *
 * 两条判据：`attempts` 与明细条数恒等；`reason` 标注正确。
 * 前者是 A4（重试叠乘不可见）的诊断基础 —— 只要这个不变式成立，
 * 「一次调用打了 16 个请求」就一定会显示成 attempts: 16。
 */
import { describe, expect, it } from 'vitest'

/** 造一个可控时钟：每次读取前进固定步长 */
const stepClock = (step = 10) => {
  let t = 1000
  return () => {
    const now = t
    t += step
    return now
  }
}

describe('transport/trace - attempts 与 trace.length 一致', () => {
  it('空收集器两者都是 0', () => {
    const c = new TraceCollector({ enabled: true })
    expect(c.attempts).toBe(0)
    expect(c.entries).toHaveLength(0)
    expect(c.snapshot()).toEqual([])
  })

  it('每 begin 一次就 +1，收尾与否都算', () => {
    const c = new TraceCollector({ enabled: true })
    c.begin({ url: 'https://a/1', method: 'GET', reason: 'initial' })()
    c.begin({ url: 'https://a/2', method: 'GET', reason: 'retry', retryOf: 'NETWORK_ERROR' })
    expect(c.attempts).toBe(2)
    expect(c.entries).toHaveLength(2)
    expect(c.attempts).toBe(c.entries.length)
  })

  it('混合来源下依然相等：prepare + initial + retry + page + segment', () => {
    const c = new TraceCollector({ enabled: true })
    c.begin({ url: 'https://a/nav', method: 'GET', reason: 'prepare' })({ status: 200 })
    c.begin({ url: 'https://a/p1', method: 'GET', reason: 'initial' })({ status: 200 })
    c.begin({ url: 'https://a/p1', method: 'GET', reason: 'retry', retryOf: 'RATE_LIMITED' })({ status: 429 })
    c.begin({ url: 'https://a/p2', method: 'GET', reason: 'page' })({ status: 200 })
    c.begin({ url: 'https://a/s1', method: 'GET', reason: 'segment' })({ status: 200 })
    c.begin({ url: 'https://a/s2', method: 'GET', reason: 'segment' })({ status: 200 })

    expect(c.attempts).toBe(6)
    expect(c.snapshot()).toHaveLength(6)
    expect(c.attempts).toBe(c.snapshot()?.length)
  })

  it('「分页 3 页 + 1 次重试 = 4」这条文档口径成立', () => {
    const c = new TraceCollector({ enabled: true })
    c.begin({ url: 'https://a/p1', method: 'GET', reason: 'initial' })({ status: 200 })
    c.begin({ url: 'https://a/p2', method: 'GET', reason: 'page' })({ status: 200 })
    c.begin({ url: 'https://a/p2', method: 'GET', reason: 'retry', retryOf: 'NETWORK_ERROR' })({ status: 200 })
    c.begin({ url: 'https://a/p3', method: 'GET', reason: 'page' })({ status: 200 })
    expect(c.attempts).toBe(4)
  })

  it('未开启 trace 时仍然计数，只是不带明细出去', () => {
    const c = new TraceCollector()
    c.begin({ url: 'https://a/1', method: 'GET', reason: 'initial' })({ status: 200 })
    c.begin({ url: 'https://a/2', method: 'GET', reason: 'page' })({ status: 200 })
    expect(c.attempts).toBe(2)
    expect(c.entries).toHaveLength(2)
    expect(c.snapshot()).toBeUndefined()
  })
})

describe('transport/trace - reason 正确标注', () => {
  it('每条记录的 reason 就是登记时给的那个，顺序保持', () => {
    const c = new TraceCollector({ enabled: true })
    for (const reason of ['prepare', 'initial', 'retry', 'page', 'segment'] as const) {
      c.begin({ url: `https://a/${reason}`, method: 'GET', reason })({ status: 200 })
    }
    expect(c.snapshot()?.map((r) => r.reason)).toEqual(['prepare', 'initial', 'retry', 'page', 'segment'])
  })

  it('countByReason 汇总各来源条数', () => {
    const c = new TraceCollector({ enabled: true })
    c.begin({ url: 'https://a/1', method: 'GET', reason: 'initial' })()
    c.begin({ url: 'https://a/2', method: 'GET', reason: 'segment' })()
    c.begin({ url: 'https://a/3', method: 'GET', reason: 'segment' })()
    c.begin({ url: 'https://a/4', method: 'GET', reason: 'prepare' })()
    expect(c.countByReason()).toEqual({ initial: 1, segment: 2, prepare: 1 })
  })

  it('retry 记录带 retryOf，非 retry 记录不带这个键', () => {
    const c = new TraceCollector({ enabled: true })
    c.begin({ url: 'https://a/1', method: 'GET', reason: 'initial' })({ status: 500 })
    c.begin({ url: 'https://a/1', method: 'GET', reason: 'retry', retryOf: 'PLATFORM_UNAVAILABLE' })({ status: 200 })

    const [first, second] = c.snapshot() ?? []
    expect('retryOf' in first).toBe(false)
    expect(second.retryOf).toBe('PLATFORM_UNAVAILABLE')
  })
})

describe('transport/trace - 单条记录的字段', () => {
  it('url / method 原样记录，status 由收尾补上', () => {
    const c = new TraceCollector({ enabled: true, now: stepClock() })
    c.begin({ url: 'https://a/x?sig=1', method: 'POST', reason: 'initial' })({ status: 204 })
    expect(c.snapshot()?.[0]).toEqual({
      url: 'https://a/x?sig=1',
      method: 'POST',
      reason: 'initial',
      status: 204,
      durationMs: 10
    })
  })

  it('请求没发出去（无 status）时不写 status 键', () => {
    const c = new TraceCollector({ enabled: true, now: stepClock() })
    c.begin({ url: 'https://a/x', method: 'GET', reason: 'initial' })()
    const entry = c.snapshot()?.[0]
    expect('status' in (entry ?? {})).toBe(false)
    expect(entry?.durationMs).toBe(10)
  })

  it('收尾前 durationMs 是 0，收尾后是真实耗时', () => {
    const c = new TraceCollector({ enabled: true, now: stepClock(25) })
    const end = c.begin({ url: 'https://a/x', method: 'GET', reason: 'initial' })
    expect(c.entries[0].durationMs).toBe(0)
    end({ status: 200 })
    expect(c.entries[0].durationMs).toBe(25)
  })

  it('snapshot 是副本，改它不影响收集器', () => {
    const c = new TraceCollector({ enabled: true })
    c.begin({ url: 'https://a/x', method: 'GET', reason: 'initial' })({ status: 200 })
    const snap = c.snapshot()
    snap![0].status = 999
    expect(c.entries[0].status).toBe(200)
  })
})
