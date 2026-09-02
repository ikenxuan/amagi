import { MIGRATED, createClient } from 'amagi/client/createClient'
import { defineEndpoint, type } from 'amagi/contracts/endpoint'
import type { AmagiResult } from 'amagi/contracts/result'
import type { AmagiBusEventMap, AmagiBusEventName } from 'amagi/runtime/events'
import { describe, expect, it } from 'vitest'
import zod from 'zod'
/**
 * client/createClient 的契约。
 *
 * 判据：四平台全部打开 `MIGRATED`（阶段 4.3 验收动作），fetcher 全部是
 * registry 派生，过渡期的 `toV7Envelope` 已删；**事件系统三根线接上**
 * （阶段 9.1 修 BUG-4：调一次 fetcher 真的会收到事件）。
 */

describe('client/createClient - MIGRATED 开关', () => {
  it('MIGRATED.xiaohongshu 已打开', () => {
    expect(MIGRATED.xiaohongshu).toBe(true)
  })

  it('MIGRATED.kuaishou 已打开（阶段 2 验收动作）', () => {
    expect(MIGRATED.kuaishou).toBe(true)
  })

  it('MIGRATED.douyin 已打开（阶段 3 验收动作）', () => {
    expect(MIGRATED.douyin).toBe(true)
  })

  it('MIGRATED.bilibili 已打开（阶段 4 验收动作）', () => {
    expect(MIGRATED.bilibili).toBe(true)
  })
})

describe('client/createClient - 门面形状', () => {
  const client = createClient({ cookies: { xiaohongshu: 'a1=ck' } })

  it('顶层键与 v6 一致', () => {
    expect(Object.keys(client).sort()).toEqual(['bilibili', 'douyin', 'events', 'kuaishou', 'on', 'once', 'startServer', 'xiaohongshu'])
  })

  it('每平台模块带 fetcher 与 utils', () => {
    for (const platform of ['douyin', 'bilibili', 'kuaishou', 'xiaohongshu'] as const) {
      expect(client[platform]).toHaveProperty('fetcher')
    }
    expect(client.xiaohongshu).toHaveProperty('sign')
    expect(client.douyin).toHaveProperty('douyinApiUrls')
  })

  it('startServer / events / on / once 齐全', () => {
    expect(typeof client.startServer).toBe('function')
    expect(typeof client.on).toBe('function')
    expect(typeof client.once).toBe('function')
    expect(client.events).toBeDefined()
  })

  it('xiaohongshu fetcher 是 registry 派生的 v7 fetcher（方法名与 v6 一致）', () => {
    const fetcher = client.xiaohongshu.fetcher as unknown as Record<string, unknown>
    expect(typeof fetcher.fetchHomeFeed).toBe('function')
    expect(typeof fetcher.fetchNoteDetail).toBe('function')
    expect(typeof fetcher.fetchNoteComments).toBe('function')
    expect(typeof fetcher.fetchUserProfile).toBe('function')
    expect(typeof fetcher.fetchUserNoteList).toBe('function')
    expect(typeof fetcher.fetchEmojiList).toBe('function')
    expect(typeof fetcher.searchNotes).toBe('function') // 不规则映射
    expect(fetcher.fetchSearchNotes).toBeUndefined()
  })

  it('kuaishou fetcher 是 registry 派生的 v7 fetcher（方法名与 v6 一致）', () => {
    const fetcher = client.kuaishou.fetcher as unknown as Record<string, unknown>
    expect(typeof fetcher.fetchVideoWork).toBe('function')
    expect(typeof fetcher.fetchWorkComments).toBe('function')
    expect(typeof fetcher.fetchUserProfile).toBe('function')
    expect(typeof fetcher.fetchUserWorkList).toBe('function')
    expect(typeof fetcher.fetchLiveRoomInfo).toBe('function')
    expect(typeof fetcher.fetchEmojiList).toBe('function')
  })

  it('douyin fetcher 是 registry 派生的 v7 fetcher（方法名与 v6 一致，含不规则映射）', () => {
    const fetcher = client.douyin.fetcher as unknown as Record<string, unknown>
    expect(typeof fetcher.fetchVideoWork).toBe('function')
    expect(typeof fetcher.parseWork).toBe('function') // 不规则：无 fetch 前缀
    expect(fetcher.fetchParseWork).toBeUndefined()
    expect(typeof fetcher.fetchWorkComments).toBe('function') // 不规则：comments
    expect(typeof fetcher.searchContent).toBe('function') // 不规则：search
    expect(fetcher.fetchSearch).toBeUndefined()
    expect(typeof fetcher.requestLoginQrcode).toBe('function') // 不规则：request 前缀
    expect(typeof fetcher.fetchDanmakuList).toBe('function')
  })

  it('bilibili fetcher 是 registry 派生的 v7 fetcher（方法名与 v6 一致）', () => {
    const fetcher = client.bilibili.fetcher as unknown as Record<string, unknown>
    expect(typeof fetcher.fetchVideoInfo).toBe('function')
    expect(typeof fetcher.fetchComments).toBe('function')
    expect(typeof fetcher.fetchVideoStreamUrl).toBe('function') // 不规则：多了 Url 后缀
    expect(typeof fetcher.convertAvToBv).toBe('function') // 不规则：convert 前缀
    expect(typeof fetcher.requestLoginQrcode).toBe('function')
  })
})

describe('client/createClient - 假端点走 v7 管线', () => {
  it('xiaohongshu fetcher 走完整管线产出 AmagiResult（adapter 注入）', async () => {
    const fakeEcho = defineEndpoint({
      name: 'xiaohongshu.fakeEcho',
      route: '/__fake_echo',
      params: zod.object({ aweme_id: zod.string().min(1) }),
      build: (p) => ({ method: 'GET', url: `https://example.com/echo?id=${p.aweme_id}` }),
      response: type<{ ok: true }>()
    })

    const client = createClient({
      cookies: { xiaohongshu: 'a1=1900000000abcdef0123456789abcdef' },
      request: {
        adapter: async (config) => ({
          data: { code: 0, success: true, msg: 'ok', data: { ok: true } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config as never
        })
      }
    })

    // createClient 用的是固定 registry，这里直接验证注册表里的端点方法可调用
    const fetcher = client.xiaohongshu.fetcher as unknown as Record<string, (options?: unknown) => Promise<AmagiResult<unknown>>>
    const result = await fetcher.fetchHomeFeed({ num: 5 })
    expect(result.success).toBe(true)
    expect(result).toHaveProperty('meta')
    expect('code' in result).toBe(false)
    void fakeEcho
  })
})

/** a1 在 cookie 里 → homeFeed 的 prepare 直接跳过，一次调用恰好一个请求 */
const XHS_COOKIE = 'a1=1900000000abcdef0123456789abcdef'

/** 造一个 adapter 注入的 client，body / status 可控 */
const clientWith = (body: unknown, status = 200, debug?: boolean) =>
  createClient({
    cookies: { xiaohongshu: XHS_COOKIE },
    ...(debug === undefined ? {} : { debug }),
    request: {
      adapter: async (config) => {
        const res = { data: body, status, statusText: String(status), headers: {}, config: config as never }
        // 自定义 adapter 必须自己跑 validateStatus，否则非 2xx 会被当成成功
        if (config.validateStatus && !config.validateStatus(status)) {
          const { AxiosError } = await import('axios')
          throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config as never, undefined, res)
        }
        return res
      }
    }
  })

/** 收一条 client 总线上的全部事件 */
const listen = (client: ReturnType<typeof createClient>, names: readonly AmagiBusEventName[]) => {
  const seen: Array<{ event: AmagiBusEventName; payload: { meta?: { requestId: string; attempts: number; endpoint: string } } }> = []
  for (const event of names) {
    client.events.on(event, (payload) => seen.push({ event, payload }))
  }
  return seen
}

const WIRED_EVENTS = ['http:request', 'http:response', 'http:error', 'api:success', 'api:error'] as const

/** 取一个平台 fetcher 的可调用视图 */
const fetcherOf = (client: ReturnType<typeof createClient>) =>
  client.xiaohongshu.fetcher as unknown as Record<string, (options?: unknown) => Promise<AmagiResult<unknown>>>

describe('client/createClient - 事件系统三根线接上（阶段 9.1 修 BUG-4）', () => {
  it('调一次 fetcher：http:request → http:response → api:success，各一条', async () => {
    const client = clientWith({ code: 0, success: true, msg: 'ok', data: { ok: true } })
    const seen = listen(client, WIRED_EVENTS)

    const result = await fetcherOf(client).fetchHomeFeed({ num: 5 })

    expect(result.success).toBe(true)
    expect(seen.map((s) => s.event)).toEqual(['http:request', 'http:response', 'api:success'])

    const success = seen[2].payload as AmagiBusEventMap['api:success']
    expect(success.meta.endpoint).toBe('xiaohongshu.homeFeed')
    expect(success.meta.requestId).toMatch(/\S/)
    expect(success.meta.clientId).toBe('client-1')
    // 事件条数与 trace 记录数一致：一个请求 → 一条 http:request → attempts 1
    expect(success.meta.attempts).toBe(1)
    expect(seen.filter((s) => s.event === 'http:request')).toHaveLength(success.meta.attempts)
    // http:* 与 api:* 落在同一个 requestId 上（否则事件之间无法关联）
    expect(seen[0].payload.meta?.requestId).toBe(success.meta.requestId)
  })

  it('业务码失败：api:error 一条，带 error.kind', async () => {
    const client = clientWith({ code: -1, msg: '风控' })
    const seen = listen(client, WIRED_EVENTS)

    const result = await fetcherOf(client).fetchHomeFeed({ num: 5 })

    expect(result.success).toBe(false)
    expect(seen.map((s) => s.event)).toEqual(['http:request', 'http:response', 'api:error'])
    const failure = seen[2].payload as AmagiBusEventMap['api:error']
    expect(failure.error.kind).toBe('unknown')
    expect(failure.error.code).toBe('PLATFORM_ERROR')
    expect(failure.meta.attempts).toBe(1)
  })

  it('参数校验失败：只有 api:error，一个请求都没发', async () => {
    const client = clientWith({ code: 0, data: {} })
    const seen = listen(client, WIRED_EVENTS)

    const result = await fetcherOf(client).fetchHomeFeed({ num: 0 })

    expect(result.success).toBe(false)
    expect(seen.map((s) => s.event)).toEqual(['api:error'])
    const failure = seen[0].payload as AmagiBusEventMap['api:error']
    expect(failure.error.kind).toBe('validation')
    expect(failure.meta.attempts).toBe(0)
  })

  it('非 2xx：http:error 也发出来（带状态码）', async () => {
    const client = clientWith({ code: -1, msg: 'not found' }, 404)
    const seen = listen(client, WIRED_EVENTS)

    await fetcherOf(client).fetchHomeFeed({ num: 5 })

    expect(seen.map((s) => s.event)).toEqual(['http:request', 'http:response', 'http:error', 'api:error'])
    expect((seen[2].payload as AmagiBusEventMap['http:error']).status).toBe(404)
  })

  it('两个实例的监听器互不串（实例级总线的意义所在）', async () => {
    const first = clientWith({ code: 0, success: true, msg: 'ok', data: { ok: true } })
    const second = clientWith({ code: 0, success: true, msg: 'ok', data: { ok: true } })
    const seenFirst = listen(first, WIRED_EVENTS)
    const seenSecond = listen(second, WIRED_EVENTS)

    await fetcherOf(first).fetchHomeFeed({ num: 5 })

    expect(seenFirst.map((s) => s.event)).toEqual(['http:request', 'http:response', 'api:success'])
    expect(seenSecond).toHaveLength(0)
    expect(first.events).not.toBe(second.events)
  })

  it('同一个 client 连调两次：attempts 不跨调用累加（每次调用一份 trace）', async () => {
    const client = clientWith({ code: 0, success: true, msg: 'ok', data: { ok: true } })
    const attempts: number[] = []
    client.events.on('api:success', (payload) => attempts.push(payload.meta.attempts))

    await fetcherOf(client).fetchHomeFeed({ num: 5 })
    await fetcherOf(client).fetchHomeFeed({ num: 5 })

    expect(attempts).toEqual([1, 1])
  })
})

describe('client/createClient - debug 开关兑现 error.raw（阶段 9.1 修 BUG-6）', () => {
  const failBody = { code: -1, msg: '风控', data: { blocked: true } }

  it('createClient({ debug: true })：失败信封的 error.raw 是原始响应体', async () => {
    const client = clientWith(failBody, 200, true)

    const result = await fetcherOf(client).fetchHomeFeed({ num: 5 })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.raw).toEqual(failBody)
    }
  })

  it('不传 debug：失败信封上连 raw 这个键都没有（不是 raw: undefined）', async () => {
    const client = clientWith(failBody)

    const result = await fetcherOf(client).fetchHomeFeed({ num: 5 })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect('raw' in result.error).toBe(false)
      expect(Object.keys(result.error)).not.toContain('raw')
    }
  })

  it('debug: false 与不传等价（同样连键都没有）', async () => {
    const client = clientWith(failBody, 200, false)

    const result = await fetcherOf(client).fetchHomeFeed({ num: 5 })

    expect(result.success).toBe(false)
    if (!result.success) expect('raw' in result.error).toBe(false)
  })

  it('debug 只影响 raw：成功信封与其余错误字段一个字节都不变', async () => {
    const withDebug = clientWith(failBody, 200, true)
    const without = clientWith(failBody)

    const a = await fetcherOf(withDebug).fetchHomeFeed({ num: 5 })
    const b = await fetcherOf(without).fetchHomeFeed({ num: 5 })

    if (!a.success && !b.success) {
      const { raw, ...restA } = a.error
      expect(raw).toBeDefined()
      expect(restA).toEqual(b.error)
    }
  })

  it('debug 开着也不给成功信封加键', async () => {
    const client = clientWith({ code: 0, success: true, msg: 'ok', data: { ok: true } }, 200, true)

    const result = await fetcherOf(client).fetchHomeFeed({ num: 5 })

    expect(result.success).toBe(true)
    expect(Object.keys(result).sort()).toEqual(['data', 'message', 'meta', 'success'])
  })

  // 静态 fetcher 的结论（client/static.ts 里写了原因）：v6 冻结的三参签名塞不下
  // 这个开关，所以静态路径**没有** raw。要 raw 就用 client 形态。
  it('静态 fetcher 没有这个开关：失败信封上同样没有 raw', async () => {
    const { xiaohongshuFetcher } = await import('amagi/model/fetchers/xiaohongshu')
    const result = await xiaohongshuFetcher.fetchHomeFeed({ num: 5 }, XHS_COOKIE, {
      adapter: async (config) => ({ data: failBody, status: 200, statusText: 'OK', headers: {}, config: config as never })
    })

    expect(result.success).toBe(false)
    if (!result.success) expect('raw' in result.error).toBe(false)
  })
})