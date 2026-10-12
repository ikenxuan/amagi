import { createFetcherFromRegistry } from 'amagi/client/fetcher'
import type { ClientCtx } from 'amagi/client/fetcher'
import { SUCCESS_MESSAGE } from 'amagi/contracts/result'
import { xiaohongshuRegistry } from 'amagi/platforms/xiaohongshu/endpoints'
import { xiaohongshuJudge } from 'amagi/platforms/xiaohongshu/judge'
import { createXiaohongshuSigners } from 'amagi/platforms/xiaohongshu/sign/signers'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
import type { AxiosAdapter } from 'axios'
import { describe, expect, it } from 'vitest'
/**
 * 阶段门 1 判据：**基础端点各有一条端到端用例**（adapter 注入，不发真实请求）。
 *
 * 每条用例走完整管线：fetcher 方法 → validate → build → sign → send →
 * decode → judge → normalize，断言：
 * - 请求的 method / URL / 签名头（x-s / x-s-common / x-t）正确；
 * - 响应被 judge / decode 正确加工后，产出成功信封。
 */

const XHS_COOKIE = 'a1=1900000000abcdef0123456789abcdef; web_session=040069abc; webId=deadbeef'

/**
 * 注入 adapter 的 HttpClient + ClientCtx（与 client/fetcher.test.ts 同一模式）。
 *
 * **`judge` 必须带上**：`callEndpoint` 是 `judge: ctx.judge`，漏了它就等于没有平台
 * judge，执行器退回「只看 2xx」的兜底判定 —— 非 2xx 会被填成 `PLATFORM_ERROR`，
 * 而不是平台 judge 给出的细分类（如 461 → `CAPTCHA_REQUIRED`）。实机走 `createClient`
 * 是带 judge 的，夹具漏配会让测试与真实路径分叉。
 */
const makeCtx = (adapter: AxiosAdapter): ClientCtx => {
  const trace = new TraceCollector()
  const http = new HttpClient({ trace, requestConfig: { adapter } })
  return {
    clientId: 'client-1',
    platform: 'xiaohongshu',
    cookie: XHS_COOKIE,
    userAgent: 'ua/1',
    requestConfig: {},
    trace,
    signers: createXiaohongshuSigners(),
    judge: xiaohongshuJudge,
    send: (spec, reason) => http.send(spec, reason)
  }
}

/** 捕获请求的 adapter，按 URL pathname 分发响应 */
const routingAdapter = (
  responses: Record<string, unknown>
): { adapter: AxiosAdapter; requests: Array<{ method?: string; url: string; headers: Record<string, unknown>; body?: unknown }> } => {
  const requests: Array<{ method?: string; url: string; headers: Record<string, unknown>; body?: unknown }> = []
  return {
    adapter: async (config) => {
      const url = config.url ?? ''
      const path = new URL(url).pathname
      requests.push({
        method: config.method,
        url,
        headers: (config.headers?.toJSON?.() ?? config.headers) as Record<string, unknown>,
        body: config.data
      })
      const body = responses[path] ?? { code: 0, success: true, msg: 'success', data: {} }
      return { data: body, status: 200, statusText: 'OK', headers: {}, config: config as never }
    },
    requests
  }
}

describe('xiaohongshu 基础端点端到端', () => {
  it('homeFeed：POST + x-s 签名头 + 请求体', async () => {
    const h = routingAdapter({ '/api/sns/web/v1/homefeed': { code: 0, success: true, msg: 'ok', data: { cursor_score: '1', items: [] } } })
    const fetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchHomeFeed({ num: 10 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as { data: { items: unknown[] } }).data.items).toEqual([])
    }
    const req = h.requests[0]
    expect(req.method).toBe('post')
    expect(req.url).toContain('/api/sns/web/v1/homefeed')
    expect(req.headers['x-s']).toBeTruthy()
    expect(req.headers['x-s-common']).toBeTruthy()
    expect(req.headers['x-t']).toBeTruthy()
    // feed 类接口带 x-rap-param（2026-03 之后的额外校验头）
    expect(req.headers['x-rap-param']).toBeTruthy()
    // x-xray-traceid：真实浏览器每次请求都带，缺了会被判 406
    expect(req.headers['x-xray-traceid']).toBeTruthy()
    // x-b3-traceid：2026-10-06 抓包的 explore `homefeed` 也带（xy-direction 需要绑定会话，
    // 这里没有会话所以不发，由 feed-session.test.ts 覆盖）
    expect(req.headers['x-b3-traceid']).toBeTruthy()
    expect(req.body).toBeDefined()
  })

  it('noteDetail：POST + note_id 进请求体', async () => {
    const h = routingAdapter({ '/api/sns/web/v1/feed': { code: 0, success: true, msg: 'ok', data: { items: [] } } })
    const fetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchNoteDetail({ note_id: 'n1', xsec_token: 'tk' })
    expect(result.success).toBe(true)
    expect(JSON.stringify(h.requests[0].body)).toContain('n1')
  })

  it('noteComments：GET + 分页声明（#61：cursor 由 paginate 管理）', async () => {
    const page1 = { code: 0, success: true, msg: 'ok', data: { comments: [{ id: 'c1' }], cursor: 'cur-2', has_more: true } }
    const page2 = { code: 0, success: true, msg: 'ok', data: { comments: [{ id: 'c2' }], cursor: 'cur-3', has_more: false } }
    const h = routingAdapter({ '/api/sns/web/v2/comment/page': page1 })
    // 第二页走同一个路径，用请求次数分发
    const original = h.adapter
    const multiAdapter: AxiosAdapter = async (config) => {
      const url = config.url ?? ''
      const req = { method: config.method, url, headers: (config.headers?.toJSON?.() ?? config.headers) as Record<string, unknown> }
      h.requests.push(req as never)
      const body = h.requests.length === 1 ? page1 : page2
      return { data: body, status: 200, statusText: 'OK', headers: {}, config: config as never }
    }
    const fetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx(multiAdapter))
    void original

    const result = await fetcher.fetchNoteComments({ note_id: 'n1', xsec_token: 'tk', number: 2 })
    expect(result.success).toBe(true)
    expect(h.requests).toHaveLength(2)
    // 第二页带上了上一页的 cursor
    expect(h.requests[1].url).toContain('cursor=cur-2')
    // 抓包实证：comment/page 用 XYS_ 签名（非 XYW_），带 x-b3-traceid 与 x-xray-traceid
    expect(String(h.requests[0].headers['x-s']).startsWith('XYS_')).toBe(true)
    expect(h.requests[0].headers['x-b3-traceid']).toBeTruthy()
    expect(h.requests[0].headers['x-xray-traceid']).toBeTruthy()
  })

  // 真机形态（2026-10-12 抓包）：游客翻评论第二页回 HTTP 461 + 一个伪装成成功的空壳。
  // 旧行为是整体失败、首页那几条一起丢；现在返回部分结果、信封照常成功 ——
  // 平台在自己那一页软拒是它的行为，不该把整个调用变成异常。noteComments 声明了
  // `partial: 'tolerate'`，所以截断经 meta.incomplete 显式告知（文案不变）。
  it('noteComments：翻页被风控中断 → 成功信封 + 保留首页条目 + meta.incomplete', async () => {
    const page1 = { code: 0, success: true, msg: 'ok', data: { comments: [{ id: 'c1' }, { id: 'c2' }], cursor: 'cur-2', has_more: true } }
    /** 第二页：平台的软拒形态 —— 461 配一个看起来成功的空壳 */
    const rejected = { code: 0, success: true, msg: '成功', data: {} }
    let calls = 0
    const adapter: AxiosAdapter = async (config) => {
      calls += 1
      return calls === 1
        ? { data: page1, status: 200, statusText: 'OK', headers: {}, config: config as never }
        : { data: rejected, status: 461, statusText: 'status code 461', headers: {}, config: config as never }
    }
    const fetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx(adapter))

    const result = await fetcher.fetchNoteComments({ note_id: 'n1', xsec_token: 'tk', number: 50 })

    expect(calls).toBe(2) // 第二页失败即停，不再继续翻
    expect(result.success).toBe(true) // 不再是失败信封
    if (result.success) {
      // 首页那两条一条不丢
      expect((result.data as { data: { comments: unknown[] } }).data.comments).toHaveLength(2)
      // 不因「少拿了」而改文案
      expect(result.message).toBe(SUCCESS_MESSAGE)
    }
    expect(result.meta.incomplete).toMatchObject({ kind: 'risk', code: 'CAPTCHA_REQUIRED' })
  })

  it('noteComments：第一页就失败 → 仍是失败信封（没有部分结果可言）', async () => {
    const adapter: AxiosAdapter = async (config) => ({
      data: { code: 0, success: true, msg: '成功', data: {} },
      status: 461,
      statusText: 'status code 461',
      headers: {},
      config: config as never
    })
    const fetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx(adapter))

    const result = await fetcher.fetchNoteComments({ note_id: 'n1', xsec_token: 'tk', number: 50 })

    expect(result.success).toBe(false)
    // 461 是平台的 antiSpider 码：本分支的 judge 判 CAPTCHA_REQUIRED（上游 beta.9 判 RISK_CONTROL）
    if (!result.success) expect(result.error.code).toBe('CAPTCHA_REQUIRED')
  })

  it('userProfile：GET JSON API', async () => {
    const h = routingAdapter({
      '/api/sns/web/v1/user/otherinfo': { code: 0, success: true, data: { basic_info: { user_id: 'u1', nickname: '昵称', avatar: 'a' } } }
    })
    const fetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchUserProfile({ user_id: 'u1', xsec_token: 'tok-1' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as { data: { basic_info?: { user_id: string } } }).data.basic_info?.user_id).toBe('u1')
    }
    // 传了 user 级 xsec_token 就必须出现在 query 里（游客缺它会被平台拦）
    expect(h.requests[0].url).toContain('xsec_token=tok-1')
  })

  it('userProfile：带 xsec_token 时 query 顺序与真机一致，且不带 x-rap-param', async () => {
    const h = routingAdapter({})
    const fetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchUserProfile({ user_id: 'u1', xsec_token: 'tk' })
    expect(result.success).toBe(true)
    const url = new URL(h.requests[0].url)
    expect([...url.searchParams.keys()]).toEqual(['target_user_id', 'xsec_token', 'xsec_source'])
    expect(url.searchParams.get('xsec_source')).toBe('pc_feed')
    // 2026-10-04 真机抓包：otherinfo 不带 x-rap-param（user_posted 才带）
    expect(h.requests[0].headers['x-rap-param']).toBeUndefined()
    expect(String(h.requests[0].headers['x-s']).startsWith('XYS_')).toBe(true)
  })

  it('userNoteList：GET + x-b3-traceid 头', async () => {
    const h = routingAdapter({
      '/api/sns/web/v1/user_posted': { code: 0, success: true, msg: 'ok', data: { cursor: '', has_more: false, notes: [] } }
    })
    const fetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchUserNoteList({ user_id: 'u1', xsec_token: 'tok-1' })
    expect(result.success).toBe(true)
    expect(h.requests[0].headers['x-b3-traceid']).toBeTruthy()
    expect(h.requests[0].headers['x-s']).toBeTruthy()
    // 真机实证（2026-10-11）：user_posted 用 XYS_ 回 200+数据、XYW_ 回 461 空 data，故用 XYS_
    expect(String(h.requests[0].headers['x-s']).startsWith('XYS_')).toBe(true)
    expect(h.requests[0].headers['x-rap-param']).toBeTruthy()
    // query 必须带 user 级 xsec_token，否则平台回 461
    expect(h.requests[0].url).toContain('xsec_token=tok-1')
  })

  it('emojiList：GET 无参数', async () => {
    const h = routingAdapter({ '/api/im/redmoji/detail': { code: 0, success: true, msg: 'ok', data: [] } })
    const fetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchEmojiList()
    expect(result.success).toBe(true)
    expect(h.requests[0].method).toBe('get')
    expect(h.requests[0].url).toContain('/api/im/redmoji/detail')
  })

  it('searchNotes：POST + search_id 进请求体（方法名不规则：searchNotes）', async () => {
    const h = routingAdapter({
      '/api/sns/web/v2/search/notes': { code: 0, success: true, msg: 'ok', data: { has_more: false, items: [] } }
    })
    const fetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx(h.adapter))

    const result = await fetcher.searchNotes({ keyword: 'k' })
    expect(result.success).toBe(true)
    const body = JSON.parse(h.requests[0].body as string) as { search_id?: string }
    expect(body.search_id).toBeTruthy()
  })
})

describe('xiaohongshu registry 结构（判据）', () => {
  it('registry 恰好 13 个端点', () => {
    expect(Object.keys(xiaohongshuRegistry)).toHaveLength(13)
  })

  it('保留已有路由并注册新增只读 API', () => {
    const routes = Object.values(xiaohongshuRegistry)
      .map((d) => d.route)
      .sort()
    expect(routes).toEqual([
      '/fetch_emoji_list',
      '/fetch_home_feed',
      '/fetch_live_room',
      '/fetch_live_square',
      '/fetch_live_status',
      '/fetch_note_comments',
      '/fetch_one_note',
      '/fetch_search_hot_list',
      '/fetch_search_notes',
      '/fetch_search_user',
      '/fetch_sub_comments',
      '/fetch_user_notes',
      '/fetch_user_profile'
    ])
  })

  it('方法名映射：searchNotes 是规则外映射（searchNotes 而非 fetchSearchNotes）', async () => {
    const fetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx(routingAdapter({}).adapter))
    expect(typeof (fetcher as unknown as Record<string, unknown>).searchNotes).toBe('function')
    expect((fetcher as unknown as Record<string, unknown>).fetchSearchNotes).toBeUndefined()
  })
})
