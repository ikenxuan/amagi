import type { ClientCtx } from 'amagi/client/fetcher'
import { createBoundFetcher, createFetcherFromRegistry } from 'amagi/client/fetcher'
import { makeClientCtx } from 'amagi/client/runtime'
import { defineEndpoint, type } from 'amagi/contracts/endpoint'
import type { RequestConfig } from 'amagi/contracts/request'
import { createEventBus } from 'amagi/runtime/events'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
/**
 * client/fetcher 的运行时契约。
 *
 * 四条判据：
 * - 方法集合**自动跟随 registry**（Proxy 实现）：registry 里有什么端点，
 *   fetcher 上就有对应 v6 方法名；`Object.keys` / `in` / 属性访问一致。
 * - 单次调用可用任意大小写 `Cookie` header 覆盖绑定 cookie（修 #23 / #32）。
 * - 假端点能走通完整管线并产出 `AmagiResult`（阶段门 0）。
 * - 事件条数与 `meta.attempts` 对得上（阶段 9.1，修 BUG-4 的接线判据）。
 *
 * 不发真实请求：通过 `HttpClient` 注入 adapter（与 events.test.ts 同一模式）。
 */
import { describe, expect, it } from 'vitest'
import zod from 'zod'

/** 假端点：带必填参数 + POST + 自定义 header（用于观察 cookie 是否传入） */
const fakeEcho = defineEndpoint({
  name: 'douyin.fakeEcho',
  route: '/__fake_echo',
  params: zod.object({ aweme_id: zod.string().min(1) }),
  build: (p, ctx) => ({
    method: 'GET',
    url: `https://example.com/echo?id=${p.aweme_id}`,
    headers: { Cookie: ctx.cookie }
  }),
  response: type<{ ok: true; echoed: string }>()
})

/** 假端点：compute 纯本地计算，不发请求 */
const fakeCompute = defineEndpoint({
  name: 'bilibili.fakeCompute',
  route: '/__fake_compute',
  params: zod.object({}),
  compute: (p) => ({ aid: Object.keys(p).length })
})

const registry = { fakeEcho, fakeCompute } as const

/** 造一个能捕获请求的 ctx，send 走注入 adapter 的 HttpClient */
const makeCtx = (options: {
  cookie?: string
  requestConfig?: RequestConfig
  body?: unknown
  status?: number
} = {}): { ctx: ClientCtx; requests: Array<{ url: string; headers: Record<string, string> }> } => {
  const requests: Array<{ url: string; headers: Record<string, string> }> = []
  // 与真实 client 一致：同一份 TraceCollector 同时给 HttpClient 记明细、
  // 给 execute 取 attempts（meta.attempts 因此等于实际请求数）
  const trace = new TraceCollector()
  const http = new HttpClient({
    trace,
    requestConfig: {
      ...(options.requestConfig ?? {}),
      adapter: async (config) => {
        requests.push({
          url: config.url ?? '',
          headers: (config.headers?.toJSON?.() ?? config.headers) as Record<string, string>
        })
        return {
          data: options.body ?? { ok: true, echoed: 'hi' },
          status: options.status ?? 200,
          statusText: 'OK',
          headers: {},
          config: config as never
        }
      }
    }
  })
  return {
    ctx: {
      clientId: 'client-1',
      platform: 'douyin',
      cookie: options.cookie ?? 'ck=bound',
      userAgent: 'ua/1',
      requestConfig: {},
      trace,
      send: (spec, reason) => http.send(spec, reason)
    },
    requests
  }
}

describe('client/fetcher - createFetcherFromRegistry', () => {
  it('方法集合自动跟随 registry：Object.keys / in / 属性访问一致', () => {
    const { ctx } = makeCtx()
    const fetcher = createFetcherFromRegistry('douyin', registry, ctx)
    expect(Object.keys(fetcher).sort()).toEqual(['fetchFakeCompute', 'fetchFakeEcho'])
    expect('fetchFakeEcho' in fetcher).toBe(true)
    expect('fetchNope' in fetcher).toBe(false)
    expect(typeof fetcher.fetchFakeEcho).toBe('function')
    expect((fetcher as Record<string, unknown>).fetchNope).toBeUndefined()
  })

  it('方法调用走完整管线，产出 AmagiResult 成功信封', async () => {
    const { ctx, requests } = makeCtx()
    const fetcher = createFetcherFromRegistry('douyin', registry, ctx)
    const result = await fetcher.fetchFakeEcho({ aweme_id: '7123' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ ok: true, echoed: 'hi' })
      expect(result.meta.endpoint).toBe('douyin.fakeEcho')
      expect(result.meta.platform).toBe('douyin')
      // 同一份 TraceCollector 同时喂 HttpClient 与 execute：attempts 就是请求数
      expect(result.meta.attempts).toBe(1)
    }
    // build 收到校验后的参数，URL 正确拼出
    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe('https://example.com/echo?id=7123')
  })

  it('compute 端点不发请求，直接算出 data', async () => {
    const { ctx, requests } = makeCtx()
    const fetcher = createFetcherFromRegistry('bilibili', registry, ctx)
    const result = await fetcher.fetchFakeCompute()
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual({ aid: 0 })
    expect(requests).toHaveLength(0)
  })

  it('参数校验失败时产出失败信封而不是抛错', async () => {
    const { ctx, requests } = makeCtx()
    const fetcher = createFetcherFromRegistry('douyin', registry, ctx)
    const result = await fetcher.fetchFakeEcho({ aweme_id: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('validation')
      expect(result.error.code).toBe('PARAM_INVALID')
    }
    expect(requests).toHaveLength(0)
  })
})

describe('client/fetcher - cookie 覆盖', () => {
  it('绑定 cookie 作为默认值传入 build', async () => {
    const { ctx, requests } = makeCtx({ cookie: 'ck=bound' })
    const fetcher = createFetcherFromRegistry('douyin', registry, ctx)
    await fetcher.fetchFakeEcho({ aweme_id: '1' })
    expect(requests[0].headers.Cookie).toBe('ck=bound')
  })

  it('大写 Cookie header 覆盖绑定 cookie', async () => {
    const { ctx, requests } = makeCtx({ cookie: 'ck=bound' })
    const fetcher = createFetcherFromRegistry('douyin', registry, ctx)
    await fetcher.fetchFakeEcho({ aweme_id: '1' }, { headers: { Cookie: 'ck=override' } })
    expect(requests[0].headers.Cookie).toBe('ck=override')
  })

  it('小写 cookie header 同样覆盖（大小写无关，修 #23/#32）', async () => {
    const { ctx, requests } = makeCtx({ cookie: 'ck=bound' })
    const fetcher = createFetcherFromRegistry('douyin', registry, ctx)
    await fetcher.fetchFakeEcho({ aweme_id: '1' }, { headers: { cookie: 'ck=override-lower' } })
    expect(requests[0].headers.Cookie).toBe('ck=override-lower')
  })
})

describe('client/fetcher - createBoundFetcher 别名', () => {
  it('与 createFetcherFromRegistry 是同一实现', () => {
    expect(createBoundFetcher).toBe(createFetcherFromRegistry)
  })
})

/**
 * 假端点：业务码失败两次后成功，`retryOn` 命中 → execute 层退避重试。
 *
 * 用它验「一次调用打了 3 个请求」时事件条数与 `attempts` 对得上
 * ——`sleep` 由 ctx 注入，所以不用真等 1s / 2s。
 */
const fakeRetry = defineEndpoint({
  name: 'douyin.fakeRetry',
  route: '/__fake_retry',
  params: zod.object({}),
  build: () => ({ method: 'GET', url: 'https://example.com/retry' }),
  judge: (raw) => {
    const ok = (raw as { status_code?: number }).status_code === 0
    return ok ? { ok: true } : { ok: false, kind: 'risk', code: 'PLATFORM_ERROR', retryable: true }
  },
  retryOn: ['PLATFORM_ERROR'],
  response: type<{ status_code: number }>()
})

describe('client/fetcher - 事件与 attempts 对得上（阶段 9.1 判据）', () => {
  it('一次调用重试两次：http:request / http:response 各 3 条，等于 meta.attempts', async () => {
    const bus = createEventBus('client-1')
    const seen: string[] = []
    const requestIds = new Set<string>()
    for (const event of ['http:request', 'http:response', 'api:success', 'api:error'] as const) {
      bus.on(event, (payload) => {
        seen.push(event)
        requestIds.add(payload.meta.requestId)
      })
    }

    let calls = 0
    const ctx: ClientCtx = {
      ...makeClientCtx(
        'douyin',
        'ck=1',
        {
          adapter: async (config) => {
            calls += 1
            return {
              data: { status_code: calls > 2 ? 0 : 1 },
              status: 200,
              statusText: 'OK',
              headers: {},
              config: config as never
            }
          }
        },
        'client-1',
        { bus }
      ),
      sleep: async () => {}
    }

    const fetcher = createFetcherFromRegistry('douyin', { fakeRetry }, ctx)
    const result = await fetcher.fetchFakeRetry()

    expect(result.success).toBe(true)
    expect(calls).toBe(3)
    if (result.success) {
      expect(result.meta.attempts).toBe(3)
      expect(seen.filter((e) => e === 'http:request')).toHaveLength(result.meta.attempts)
      expect(seen.filter((e) => e === 'http:response')).toHaveLength(result.meta.attempts)
    }
    expect(seen).toEqual([
      'http:request',
      'http:response',
      'http:request',
      'http:response',
      'http:request',
      'http:response',
      'api:success'
    ])
    // 一次调用 = 一个 requestId，7 条事件全落在同一个上
    expect(requestIds.size).toBe(1)
  })
})