import { createFetcherFromRegistry } from 'amagi/client/fetcher'
import type { ClientCtx } from 'amagi/client/fetcher'
import { xiaohongshuRegistry } from 'amagi/platforms/xiaohongshu/endpoints'
import { createXiaohongshuSigners } from 'amagi/platforms/xiaohongshu/sign/signers'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
import type { AxiosAdapter } from 'axios'
import { describe, expect, it } from 'vitest'
/**
 * 阶段门 1 判据：**7 个端点各有一条端到端用例**（adapter 注入，不发真实请求）。
 *
 * 每条用例走完整管线：fetcher 方法 → validate → build → sign → send →
 * decode → judge → normalize，断言：
 * - 请求的 method / URL / 签名头（x-s / x-s-common / x-t）正确；
 * - 响应被 judge / decode 正确加工后，产出成功信封。
 */

const XHS_COOKIE = 'a1=1900000000abcdef0123456789abcdef; web_session=040069abc; webId=deadbeef'

/** 注入 adapter 的 HttpClient + ClientCtx（与 client/fetcher.test.ts 同一模式） */
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
    send: (spec, reason) => http.send(spec, reason)
  }
}

/** 捕获请求的 adapter，按 URL pathname 分发响应 */
const routingAdapter = (responses: Record<string, unknown>): { adapter: AxiosAdapter; requests: Array<{ method?: string; url: string; headers: Record<string, unknown>; body?: unknown }> } => {
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

describe('xiaohongshu 7 个端点端到端', () => {
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
  })

  it('userProfile：GET + HTML decode（__INITIAL_STATE__）', async () => {
    const html = '<script>window.__INITIAL_STATE__={"user":{"userPageData":{"basic_info":{"user_id":"u1","nickname":"昵称","avatar":"a"}}}}</script>'
    const h = routingAdapter({ '/user/profile/u1': html })
    const fetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchUserProfile({ user_id: 'u1' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as { data: { basic_info?: { user_id: string } } }).data.basic_info?.user_id).toBe('u1')
    }
  })

  it('userNoteList：GET + x-b3-traceid 头', async () => {
    const h = routingAdapter({ '/api/sns/web/v1/user_posted': { code: 0, success: true, msg: 'ok', data: { cursor: '', has_more: false, notes: [] } } })
    const fetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchUserNoteList({ user_id: 'u1' })
    expect(result.success).toBe(true)
    expect(h.requests[0].headers['x-b3-traceid']).toBeTruthy()
    expect(h.requests[0].headers['x-s']).toBeTruthy()
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
    const h = routingAdapter({ '/api/sns/web/v1/search/notes': { code: 0, success: true, msg: 'ok', data: { has_more: false, items: [] } } })
    const fetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx(h.adapter))

    const result = await fetcher.searchNotes({ keyword: 'k' })
    expect(result.success).toBe(true)
    const body = JSON.parse(h.requests[0].body as string) as { search_id?: string }
    expect(body.search_id).toBeTruthy()
  })
})

describe('xiaohongshu registry 结构（判据）', () => {
  it('registry 恰好 7 个端点', () => {
    expect(Object.keys(xiaohongshuRegistry)).toHaveLength(7)
  })

  it('路由与 v6 逐条一致', () => {
    const routes = Object.values(xiaohongshuRegistry).map((d) => d.route).sort()
    expect(routes).toEqual([
      '/fetch_emoji_list',
      '/fetch_home_feed',
      '/fetch_note_comments',
      '/fetch_one_note',
      '/fetch_search_notes',
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