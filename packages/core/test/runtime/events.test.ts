import type { AmagiMeta } from 'amagi/contracts/meta'
import {
  AMAGI_EVENT_NAMES,
  type AmagiEventName,
  createEventBus,
  createTransportEmitter,
  defaultEventBus,
  EventBus
} from 'amagi/runtime/events'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
/**
 * runtime/events 的契约。
 *
 * 三条判据：两个 client 的总线互相隔离；静态 fetcher 用全局实例；
 * 所有负载带 meta。前两条修 v6 的全局单例（一条总线服务所有实例），
 * 第三条修缺陷 10（事件负载没有任何关联 id，多实例并发时无法归因）。
 */
import { describe, expect, it } from 'vitest'

const metaOf = (overrides: Partial<AmagiMeta> = {}): AmagiMeta => ({
  requestId: 'req-1',
  clientId: 'client-1',
  platform: 'douyin',
  endpoint: 'douyin.videoWork',
  durationMs: 12,
  attempts: 1,
  ...overrides
})

/** 收一条总线上所有事件的负载 */
const collect = (bus: EventBus) => {
  const seen: Array<{ event: AmagiEventName; payload: { meta: AmagiMeta } }> = []
  for (const event of AMAGI_EVENT_NAMES) {
    bus.on(event, (payload) => seen.push({ event, payload }))
  }
  return seen
}

describe('runtime/events - 事件名清单', () => {
  it('恰好四个事件，全部是调用相关的', () => {
    expect(AMAGI_EVENT_NAMES).toEqual(['http:request', 'http:response', 'api:success', 'api:error'])
  })
})

describe('runtime/events - 两个 client 的总线互相隔离', () => {
  it('一条总线上的监听器收不到另一条的事件', () => {
    const a = createEventBus('a')
    const b = createEventBus('b')
    const seenA = collect(a)
    const seenB = collect(b)

    a.emit('api:success', { meta: metaOf({ clientId: 'a' }), data: { from: 'a' } })
    b.emit('api:error', {
      meta: metaOf({ clientId: 'b' }),
      error: { kind: 'auth', code: 'COOKIE_EXPIRED', message: '失效', retryable: false }
    })

    expect(seenA).toHaveLength(1)
    expect(seenB).toHaveLength(1)
    expect(seenA[0].event).toBe('api:success')
    expect(seenA[0].payload.meta.clientId).toBe('a')
    expect(seenB[0].event).toBe('api:error')
    expect(seenB[0].payload.meta.clientId).toBe('b')
  })

  it('监听器数量各自独立统计', () => {
    const a = createEventBus()
    const b = createEventBus()
    a.on('api:success', () => {})
    a.on('api:success', () => {})
    b.on('api:success', () => {})

    expect(a.listenerCount('api:success')).toBe(2)
    expect(b.listenerCount('api:success')).toBe(1)
  })

  it('清空一条总线不影响另一条', () => {
    const a = createEventBus()
    const b = createEventBus()
    a.on('api:success', () => {})
    b.on('api:success', () => {})

    a.removeAllListeners()

    expect(a.listenerCount('api:success')).toBe(0)
    expect(b.listenerCount('api:success')).toBe(1)
  })

  it('emit 在无人监听时返回 false，有人监听时返回 true', () => {
    const bus = createEventBus()
    expect(bus.emit('api:success', { meta: metaOf(), data: null })).toBe(false)
    bus.on('api:success', () => {})
    expect(bus.emit('api:success', { meta: metaOf(), data: null })).toBe(true)
  })

  it('once 只触发一次，off 能摘掉监听器', () => {
    const bus = createEventBus()
    let onceCount = 0
    let onCount = 0
    const handler = () => onCount++
    bus.once('api:success', () => onceCount++)
    bus.on('api:success', handler)

    bus.emit('api:success', { meta: metaOf(), data: 1 })
    bus.emit('api:success', { meta: metaOf(), data: 2 })
    bus.off('api:success', handler)
    bus.emit('api:success', { meta: metaOf(), data: 3 })

    expect(onceCount).toBe(1)
    expect(onCount).toBe(2)
  })
})

describe('runtime/events - 静态 fetcher 用全局实例', () => {
  it('defaultEventBus 是唯一的全局总线，id 为 global', () => {
    expect(defaultEventBus).toBeInstanceOf(EventBus)
    expect(defaultEventBus.id).toBe('global')
  })

  it('createEventBus 每次都造新的一条，都不等于全局实例', () => {
    const a = createEventBus()
    const b = createEventBus()
    expect(a).not.toBe(b)
    expect(a).not.toBe(defaultEventBus)
  })

  it('全局实例与 client 实例的总线互不串扰', () => {
    const client = createEventBus('client-1')
    const seenGlobal = collect(defaultEventBus)
    const seenClient = collect(client)
    try {
      client.emit('api:success', { meta: metaOf({ clientId: 'client-1' }), data: 1 })
      expect(seenGlobal).toHaveLength(0)
      expect(seenClient).toHaveLength(1)

      defaultEventBus.emit('api:success', { meta: metaOf({ clientId: 'static' }), data: 2 })
      expect(seenGlobal).toHaveLength(1)
      expect(seenGlobal[0].payload.meta.clientId).toBe('static')
      expect(seenClient).toHaveLength(1)
    } finally {
      defaultEventBus.removeAllListeners()
    }
  })
})

describe('runtime/events - 所有负载带 meta', () => {
  it('四个事件的负载都能读到完整 meta', () => {
    const bus = createEventBus()
    const seen = collect(bus)
    const meta = metaOf()

    bus.emit('http:request', { meta, trace: { url: 'https://a/1', method: 'GET', durationMs: 0, reason: 'initial' } })
    bus.emit('http:response', { meta, trace: { url: 'https://a/1', method: 'GET', durationMs: 3, reason: 'initial', status: 200 } })
    bus.emit('api:success', { meta, data: { ok: 1 } })
    bus.emit('api:error', { meta, error: { kind: 'network', code: 'NETWORK_ERROR', message: '断了', retryable: true } })

    expect(seen).toHaveLength(4)
    for (const { payload } of seen) {
      expect(payload.meta.requestId).toBe('req-1')
      expect(payload.meta.clientId).toBe('client-1')
      expect(payload.meta.endpoint).toBe('douyin.videoWork')
      expect(payload.meta.platform).toBe('douyin')
      expect(typeof payload.meta.attempts).toBe('number')
    }
  })
})

describe('runtime/events - createTransportEmitter 补 meta', () => {
  it('transport 只发 trace，meta 由这层补上（修 KNOWN-DEFECT #5 的完整链路）', async () => {
    const bus = createEventBus('client-1')
    const seen = collect(bus)
    const tracer = new TraceCollector({ enabled: true })
    const client = new HttpClient({
      trace: tracer,
      emit: createTransportEmitter(bus, () => metaOf({ attempts: tracer.attempts })),
      requestConfig: {
        adapter: async (config) => ({
          data: { ok: 1 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config as never
        })
      }
    })

    await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(seen.map((s) => s.event)).toEqual(['http:request', 'http:response'])
    for (const { payload } of seen) {
      expect(payload.meta.requestId).toBe('req-1')
      expect(payload.meta.endpoint).toBe('douyin.videoWork')
    }
  })

  it('meta 是惰性取的：attempts 随调用推进而变化', async () => {
    const bus = createEventBus()
    const attemptsSeen: number[] = []
    bus.on('http:response', (payload) => attemptsSeen.push(payload.meta.attempts))
    const tracer = new TraceCollector({ enabled: true })
    let calls = 0
    const client = new HttpClient({
      trace: tracer,
      sleep: async () => {},
      emit: createTransportEmitter(bus, () => metaOf({ attempts: tracer.attempts })),
      requestConfig: {
        adapter: async (config) => {
          calls += 1
          if (calls === 1) {
            const { AxiosError } = await import('axios')
            const err = new AxiosError('mock ECONNRESET', 'ECONNRESET', config as never)
            err.code = 'ECONNRESET'
            throw err
          }
          return { data: { ok: 1 }, status: 200, statusText: 'OK', headers: {}, config: config as never }
        }
      }
    })

    await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(attemptsSeen).toEqual([1, 2])
  })
})
