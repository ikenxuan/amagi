import type { ClientCtx } from 'amagi/client/fetcher'
import { createBoundFetcher, createFetcherFromRegistry } from 'amagi/client/fetcher'
import { defineEndpoint, type } from 'amagi/contracts/endpoint'
import type { RequestConfig } from 'amagi/contracts/request'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
/**
 * client/fetcher 的运行时契约。
 *
 * 三条判据：
 * - 方法集合**自动跟随 registry**（Proxy 实现）：registry 里有什么端点，
 *   fetcher 上就有对应 v6 方法名；`Object.keys` / `in` / 属性访问一致。
 * - 单次调用可用任意大小写 `Cookie` header 覆盖绑定 cookie（修 #23 / #32）。
 * - 假端点能走通完整管线并产出 `AmagiResult`（阶段门 0）。
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