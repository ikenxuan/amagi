import type { AmagiMeta, RequestTrace } from 'amagi/contracts/meta'
import type { AmagiEventType } from 'amagi/model/events'
import {
  AMAGI_BUS_EVENT_NAMES,
  type AmagiBusEventMap,
  type AmagiBusEventName,
  createEventBus,
  createTransportEmitter,
  defaultEventBus,
  EventBus,
  SESSION_BUS_EVENT_NAMES,
  UNEMITTED_BUS_EVENT_NAMES,
  V6_ALIGNED_BUS_EVENT_NAMES
} from 'amagi/runtime/events'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
/**
 * runtime/events 的契约。
 *
 * 五条判据：两个 client 的总线互相隔离；静态 fetcher 用全局实例；
 * 调用相关的负载都带 meta；**事件名与 v6 的 12 个逐名对齐**；
 * **三个 v7 独占的会话事件另立一组、且真的有类型**。
 * 前两条修 v6 的全局单例（一条总线服务所有实例），第三条修缺陷 10
 * （事件负载没有任何关联 id，多实例并发时无法归因），第四条修
 * 「4 vs 12」的事件名缺口（阶段 9.1），第五条修 BUG-7
 * （`session:*` 有 emit、没类型，两个 `as never` 把洞按住）。
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

const traceOf = (overrides: Partial<RequestTrace> = {}): RequestTrace => ({
  url: 'https://a/1',
  method: 'GET',
  durationMs: 3,
  reason: 'initial',
  ...overrides
})

/** 会话事件的 meta：一个会话一个 requestId，endpoint 是 `<platform>.login` */
const SESSION_META = metaOf({ platform: 'bilibili', endpoint: 'bilibili.login', durationMs: 0, attempts: 0 })

/** 会话事件负载里的二维码 */
const QRCODE = { content: 'https://qr', token: 'k1', expiresAt: 1_700_000_000_000, expiresInSec: 180 }

/**
 * 每个事件名一份合法负载。
 *
 * 映射类型是刻意的：漏一个事件名就编译不过，所以下面的对齐用例不可能
 * 「因为忘了写负载」而偷偷少测一个名字。
 */
const PAYLOADS: { [K in AmagiBusEventName]: AmagiBusEventMap[K] } = {
  'log:info': { level: 'info', message: 'i' },
  'log:warn': { level: 'warn', message: 'w' },
  'log:error': { level: 'error', message: 'e' },
  'log:debug': { level: 'debug', message: 'd' },
  'log:mark': { level: 'mark', message: 'm' },
  'http:request': { meta: metaOf(), trace: traceOf() },
  'http:response': { meta: metaOf(), trace: traceOf({ status: 200 }) },
  'http:error': { meta: metaOf(), trace: traceOf({ status: 404 }), status: 404 },
  'network:retry': {
    meta: metaOf(),
    trace: traceOf(),
    code: 'NETWORK_ERROR',
    errno: 'ECONNRESET',
    attempt: 1,
    maxRetries: 3,
    delayMs: 1000
  },
  'network:error': { meta: metaOf(), trace: traceOf(), code: 'NETWORK_ERROR', errno: 'ENOTFOUND', message: '断了', attempts: 4 },
  'api:success': { meta: metaOf(), data: { ok: 1 } },
  'api:error': { meta: metaOf(), error: { kind: 'auth', code: 'COOKIE_EXPIRED', message: '失效', retryable: false } },
  'session:state': { meta: SESSION_META, state: { phase: 'pending', qrcode: QRCODE } },
  'session:error': { meta: SESSION_META, error: { kind: 'risk', code: 'RISK_CONTROL', message: '设备环境异常', retryable: false } },
  'session:success': { meta: SESSION_META, credential: { cookie: 'SESSDATA=ok', raw: {} } }
}

/**
 * v6 `AmagiEventType` 的 12 个取值，逐个抄在这里。
 *
 * 两道编译期闸门：`satisfies readonly AmagiBusEventName[]` 保证每个 v6 名字
 * 在实例总线上存在（少一个就红）；`AssertNoMissing` 保证这张清单没漏抄 v6
 * 的取值（v6 加了新事件名而这里没跟，也红）。
 */
const V6_EVENT_NAMES = [
  'log:info',
  'log:warn',
  'log:error',
  'log:debug',
  'log:mark',
  'http:request',
  'http:response',
  'http:error',
  'network:retry',
  'network:error',
  'api:success',
  'api:error'
] as const satisfies readonly AmagiBusEventName[]

/** 断言 `T` 为 `never`：v6 取值有任何一个没被上面的清单覆盖，这行就报错 */
type AssertNever<T extends never> = T
type AssertNoMissing = AssertNever<Exclude<AmagiEventType, (typeof V6_EVENT_NAMES)[number]>>

/**
 * 第三道编译期闸门：`AMAGI_BUS_EVENT_NAMES` 必须覆盖 `AmagiBusEventMap` 的每个键。
 *
 * 源码里的 `satisfies readonly AmagiBusEventName[]` 只管一个方向（清单里不许有
 * 映射表没有的名字）；这行管反方向 —— 映射表加了名字而清单没跟上（`session:*`
 * 就是这么进来的），这行报错。
 */
type AssertNoUncovered = AssertNever<Exclude<AmagiBusEventName, (typeof AMAGI_BUS_EVENT_NAMES)[number]>>

/** 收一条总线上所有事件的负载 */
const collect = (bus: EventBus) => {
  const seen: Array<{ event: AmagiBusEventName; payload: { meta?: AmagiMeta } }> = []
  for (const event of AMAGI_BUS_EVENT_NAMES) {
    bus.on(event, (payload) => seen.push({ event, payload }))
  }
  return seen
}

describe('runtime/events - 事件名与 v6 的 12 个对齐（阶段 9.1 判据）', () => {
  it('v6 对齐清单就是 AmagiEventType 的 12 个取值，顺序也一致', () => {
    expect(V6_ALIGNED_BUS_EVENT_NAMES).toEqual([...V6_EVENT_NAMES])
    expect(V6_ALIGNED_BUS_EVENT_NAMES).toHaveLength(12)
    // 编译期闸门的运行时替身：类型别名不会被 vitest 求值，这行保证它被引用
    expect<AssertNoMissing[]>([]).toEqual([])
  })

  it('全部清单 = 12 个 v6 对齐 + 3 个 v7 会话，两组互不重叠', () => {
    expect(AMAGI_BUS_EVENT_NAMES).toEqual([...V6_ALIGNED_BUS_EVENT_NAMES, ...SESSION_BUS_EVENT_NAMES])
    expect(AMAGI_BUS_EVENT_NAMES).toHaveLength(15)
    // session:* 不许混进「与 v6 逐名对齐」那一组（v6 AmagiEventType 里没有它们）
    const session: readonly string[] = SESSION_BUS_EVENT_NAMES
    expect(V6_ALIGNED_BUS_EVENT_NAMES.filter((name) => session.includes(name))).toEqual([])
    expect<AssertNoUncovered[]>([]).toEqual([])
  })

  it('v6 的每个取值都能在实例总线上 on，并收到自己的负载（漏一个即红）', () => {
    const bus = createEventBus('align')
    const received: string[] = []
    for (const event of V6_EVENT_NAMES) {
      bus.on(event, () => received.push(event))
    }

    for (const event of V6_EVENT_NAMES) {
      expect(bus.listenerCount(event)).toBe(1)
      expect(bus.emit(event, PAYLOADS[event])).toBe(true)
    }

    expect(received).toEqual([...V6_EVENT_NAMES])
  })

  it.each([...V6_EVENT_NAMES])('%s 在实例总线上可 on / once / off', (event) => {
    const bus = createEventBus()
    const listener = () => {}
    bus.on(event, listener)
    bus.once(event, () => {})
    expect(bus.listenerCount(event)).toBe(2)
    bus.off(event, listener)
    expect(bus.listenerCount(event)).toBe(1)
  })

  // 名字对齐 ≠ 都会发。这两个是**记录在案的不对齐**（06-migration 的事件小节）：
  // v6 的 log:info 同样零 emit 点；log:debug 只由已 @deprecated 的抖音 passport
  // 路径写全局单例。谁给它们接了线，就该同时改清单与文档。
  it('KNOWN-GAP: log:info / log:debug 在 v7 核心链路没有 emit 点', () => {
    expect([...UNEMITTED_BUS_EVENT_NAMES]).toEqual(['log:info', 'log:debug'])
    for (const event of UNEMITTED_BUS_EVENT_NAMES) {
      expect(AMAGI_BUS_EVENT_NAMES).toContain(event)
    }
  })
})

describe('runtime/events - 三个会话事件进了总线（阶段 9.1 修 BUG-7）', () => {
  it('session:* 三个名字都能 on 并收到自己的负载', () => {
    const bus = createEventBus('session')
    const received: string[] = []
    for (const event of SESSION_BUS_EVENT_NAMES) {
      bus.on(event, () => received.push(event))
      expect(bus.listenerCount(event)).toBe(1)
    }

    for (const event of SESSION_BUS_EVENT_NAMES) {
      expect(bus.emit(event, PAYLOADS[event])).toBe(true)
    }

    expect(received).toEqual(['session:state', 'session:error', 'session:success'])
  })

  it.each([...SESSION_BUS_EVENT_NAMES])('%s 在实例总线上可 on / once / off', (event) => {
    const bus = createEventBus()
    const listener = () => {}
    bus.on(event, listener)
    bus.once(event, () => {})
    expect(bus.listenerCount(event)).toBe(2)
    bus.off(event, listener)
    expect(bus.listenerCount(event)).toBe(1)
  })

  it('负载类型就是引擎现场那一份：meta + state / error / credential', () => {
    const bus = createEventBus()
    const seen: string[] = []
    // 三个回调的形参**不带类型标注**：能读出这些字段全靠 AmagiBusEventMap 推导
    // —— 这就是「`client.events.on('session:state', (d) => d.meta.requestId)`
    // 编译通过」那条判据在总线层的样子
    bus.on('session:state', (payload) => seen.push(`${payload.meta.requestId}:${payload.state.phase}`))
    bus.on('session:error', (payload) => seen.push(`${payload.meta.endpoint}:${payload.error.code}`))
    bus.on('session:success', (payload) => seen.push(`${payload.meta.platform}:${payload.credential.cookie}`))

    bus.emit('session:state', PAYLOADS['session:state'])
    bus.emit('session:error', PAYLOADS['session:error'])
    bus.emit('session:success', PAYLOADS['session:success'])

    expect(seen).toEqual(['req-1:pending', 'bilibili.login:RISK_CONTROL', 'bilibili:SESSDATA=ok'])
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
    expect(seenA[0].payload.meta?.clientId).toBe('a')
    expect(seenB[0].event).toBe('api:error')
    expect(seenB[0].payload.meta?.clientId).toBe('b')
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
      expect(seenGlobal[0].payload.meta?.clientId).toBe('static')
      expect(seenClient).toHaveLength(1)
    } finally {
      defaultEventBus.removeAllListeners()
    }
  })
})

describe('runtime/events - 调用相关的负载都带 meta', () => {
  it('七个调用相关事件的负载都能读到完整 meta', () => {
    const bus = createEventBus()
    const seen = collect(bus)
    const meta = metaOf()

    bus.emit('http:request', { meta, trace: traceOf({ durationMs: 0 }) })
    bus.emit('http:response', { meta, trace: traceOf({ status: 200 }) })
    bus.emit('http:error', { meta, trace: traceOf({ status: 412 }), status: 412 })
    bus.emit('network:retry', { ...PAYLOADS['network:retry'], meta })
    bus.emit('network:error', { ...PAYLOADS['network:error'], meta })
    bus.emit('api:success', { meta, data: { ok: 1 } })
    bus.emit('api:error', { meta, error: { kind: 'network', code: 'NETWORK_ERROR', message: '断了', retryable: true } })

    expect(seen).toHaveLength(7)
    for (const { payload } of seen) {
      expect(payload.meta?.requestId).toBe('req-1')
      expect(payload.meta?.clientId).toBe('client-1')
      expect(payload.meta?.endpoint).toBe('douyin.videoWork')
      expect(payload.meta?.platform).toBe('douyin')
      expect(typeof payload.meta?.attempts).toBe('number')
    }
  })

  it('log:* 的 meta 可缺省 —— 不属于任何一次调用的日志（如服务启动）没有它', () => {
    const bus = createEventBus()
    const seen = collect(bus)

    bus.emit('log:mark', { level: 'mark', message: 'Amagi server listening on http://localhost:4567' })

    expect(seen).toHaveLength(1)
    expect(seen[0].payload.meta).toBeUndefined()
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
      expect(payload.meta?.requestId).toBe('req-1')
      expect(payload.meta?.endpoint).toBe('douyin.videoWork')
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

/**
 * 造一个 emit 已接好的 HttpClient，adapter 按脚本回应。
 *
 * adapter **自己执行 `config.validateStatus`**（与 test/transport/client.test.ts
 * 同款）：axios 只在内置 adapter 里调 `settle`，自定义 adapter 一 resolve 就被
 * 当成成功，不复刻这一步的话 429 / 5xx 根本进不到退避分支。
 */
const wiredClient = (bus: EventBus, script: Array<{ status?: number; errno?: string }>, retry?: { maxRetries?: number }) => {
  const tracer = new TraceCollector({ enabled: true })
  let calls = 0
  const client = new HttpClient({
    trace: tracer,
    sleep: async () => {},
    ...(retry === undefined ? {} : { retry }),
    emit: createTransportEmitter(bus, () => metaOf({ attempts: tracer.attempts })),
    requestConfig: {
      adapter: async (config) => {
        const step = script[Math.min(calls, script.length - 1)]
        calls += 1
        const { AxiosError } = await import('axios')
        if (step.errno !== undefined) {
          const err = new AxiosError(`mock ${step.errno}`, step.errno, config as never)
          err.code = step.errno
          throw err
        }
        const status = step.status ?? 200
        const res = { data: { ok: 1 }, status, statusText: String(status), headers: {}, config: config as never }
        if (config.validateStatus && !config.validateStatus(status)) {
          throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config as never, undefined, res)
        }
        return res
      }
    }
  })
  return { client, tracer }
}

describe('runtime/events - 新补的三个事件名真的会发（阶段 9.1）', () => {
  it('非 2xx：http:response 之后再发一条 http:error，带状态码', async () => {
    const bus = createEventBus()
    const seen = collect(bus)
    const { client } = wiredClient(bus, [{ status: 404 }])

    await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(seen.map((s) => s.event)).toEqual(['http:request', 'http:response', 'http:error'])
    const httpError = seen[2].payload as AmagiBusEventMap['http:error']
    expect(httpError.status).toBe(404)
    expect(httpError.trace.status).toBe(404)
    expect(httpError.meta.requestId).toBe('req-1')
  })

  it('2xx 不发 http:error', async () => {
    const bus = createEventBus()
    const seen = collect(bus)
    const { client } = wiredClient(bus, [{ status: 204 }])

    await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(seen.map((s) => s.event)).not.toContain('http:error')
  })

  it('重试：network:retry 带退避事实，并顺带一条 v6 同款 log:warn', async () => {
    const bus = createEventBus()
    const seen = collect(bus)
    const { client } = wiredClient(bus, [{ errno: 'ECONNRESET' }, { status: 200 }])

    await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(seen.map((s) => s.event)).toEqual([
      'http:request',
      'http:response',
      'network:retry',
      'log:warn',
      'http:request',
      'http:response'
    ])
    const retry = seen[2].payload as AmagiBusEventMap['network:retry']
    expect(retry).toMatchObject({ code: 'NETWORK_ERROR', errno: 'ECONNRESET', attempt: 1, maxRetries: 3, delayMs: 1000 })
    expect(retry.meta.requestId).toBe('req-1')
    const warn = seen[3].payload as AmagiBusEventMap['log:warn']
    expect(warn.level).toBe('warn')
    expect(warn.message).toBe('网络请求失败 [ECONNRESET]，1000ms 后进行第 1 次重试...')
  })

  it('429 也进 network:retry（v6 因 validateStatus 恒真而从不重试）', async () => {
    const bus = createEventBus()
    const seen = collect(bus)
    const { client } = wiredClient(bus, [{ status: 429 }, { status: 200 }])

    await client.send({ method: 'GET', url: 'https://example.com/a' })

    const retry = seen.find((s) => s.event === 'network:retry')?.payload as AmagiBusEventMap['network:retry']
    expect(retry).toMatchObject({ code: 'RATE_LIMITED', status: 429, attempt: 1 })
    expect(retry.errno).toBeUndefined()
    // 这一次的 http:error 也在（响应回来了，只是 429）
    expect(seen.filter((s) => s.event === 'http:error')).toHaveLength(1)
  })

  it('退避用尽：network:error 带 attempts，并顺带一条 v6 同款 log:error', async () => {
    const bus = createEventBus()
    const seen = collect(bus)
    const { client } = wiredClient(bus, [{ errno: 'ENOTFOUND' }], { maxRetries: 0 })

    await expect(client.send({ method: 'GET', url: 'https://example.com/a' })).rejects.toThrow()

    expect(seen.map((s) => s.event)).toEqual(['http:request', 'http:response', 'network:error', 'log:error'])
    const failure = seen[2].payload as AmagiBusEventMap['network:error']
    expect(failure).toMatchObject({ code: 'NETWORK_ERROR', errno: 'ENOTFOUND', attempts: 1 })
    expect(failure.message).toContain('ENOTFOUND')
    const logged = seen[3].payload as AmagiBusEventMap['log:error']
    expect(logged.level).toBe('error')
    expect(logged.message).toBe('网络请求失败:')
    expect(logged.args?.[0]).toContain('ENOTFOUND')
  })
})
