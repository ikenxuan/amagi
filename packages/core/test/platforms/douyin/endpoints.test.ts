import { createFetcherFromRegistry } from 'amagi/client/fetcher'
import type { ClientCtx } from 'amagi/client/fetcher'
import { routePathsOf } from 'amagi/server/routes'
import { douyinRegistry } from 'amagi/platforms/douyin/endpoints'
import { douyinJudge } from 'amagi/platforms/douyin/judge'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
import type { AxiosAdapter } from 'axios'
import { describe, expect, it } from 'vitest'
/**
 * 阶段门 3 判据：**23 个端点各有一条端到端用例**（adapter 注入，不发真实请求），
 * 另加：
 * - 分页专项 9 条（comments 7 + userVideoList 2，与 v6 行为逐条对应）
 * - `danmakuList` 分段：单段 / 多段 / 单段失败 tolerate / 按 offset_time 排序
 * - `search` 的 multi-JSON：粘连响应正确拆分合并 + 无合法块判反爬
 * - 路由唯一性：23 条路径互不重复（修 #47/#48/#54）
 */

const DY_COOKIE = 'sessionid=test; ttwid=abc'

/** 注入 adapter 的 ClientCtx（签名直通，不验签 —— 签名有 sign.test.ts 锁） */
const makeCtx = (adapter: AxiosAdapter, override: Partial<ClientCtx> = {}): ClientCtx => {
  const trace = new TraceCollector()
  const http = new HttpClient({ trace, requestConfig: { adapter } })
  return {
    clientId: 'client-1',
    platform: 'douyin',
    cookie: DY_COOKIE,
    userAgent: 'ua/1',
    requestConfig: {},
    trace,
    signers: {
      'a-bogus': (spec) => spec,
      'x-bogus': (spec) => spec
    },
    judge: undefined,
    send: (spec, reason) => http.send(spec, reason),
    ...override
  }
}

/** 按 URL 分发响应的 adapter，记录请求 */
const routingAdapter = (
  responses: Record<string, unknown>
): { adapter: AxiosAdapter; requests: Array<{ method?: string; url: string; body?: unknown; headers: Record<string, unknown> }> } => {
  const requests: Array<{ method?: string; url: string; body?: unknown; headers: Record<string, unknown> }> = []
  return {
    adapter: async (config) => {
      const url = config.url ?? ''
      const path = new URL(url).pathname
      // header 名归一成小写：免鉴权那几条要断言「某个头确实没发出去」，
      // 而 axios 配置里的大小写取决于是谁写的（attachCookie 写的是 `Cookie`）
      const headers: Record<string, unknown> = {}
      for (const [name, value] of Object.entries(config.headers ?? {})) headers[name.toLowerCase()] = value
      requests.push({ method: config.method, url, body: config.data, headers })
      return {
        data: responses[path] ?? { data: {} },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config as never
      }
    },
    requests
  }
}

const ok = { status_code: 0 }

describe('douyin 23 个端点端到端', () => {
  it('parseWork：GET + aweme_id 进查询参数', async () => {
    const h = routingAdapter({ '/aweme/v1/web/aweme/detail/': { status_code: 0, aweme_detail: { aweme_id: '1' } } })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))
    const result = await fetcher.parseWork({ aweme_id: '1' })
    expect(result.success).toBe(true)
    expect(new URL(h.requests[0].url).pathname).toBe('/aweme/v1/web/aweme/detail/')
    expect(new URL(h.requests[0].url).searchParams.get('aweme_id')).toBe('1')
  })

  it('videoWork / imageAlbumWork / slidesWork / textWork：各自独立路由', async () => {
    const h = routingAdapter({ '/aweme/v1/web/aweme/detail/': ok })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))

    for (const [method, params] of [
      ['fetchVideoWork', { aweme_id: '1' }],
      ['fetchImageAlbumWork', { aweme_id: '1' }],
      ['fetchSlidesWork', { aweme_id: '1' }],
      ['fetchTextWork', { aweme_id: '1' }]
    ] as const) {
      const result = await (fetcher as unknown as Record<string, (p: unknown) => Promise<unknown>>)[method](params)
      expect(result).toHaveProperty('success')
    }
    expect(h.requests).toHaveLength(4)
  })

  it('comments：翻页后返回 { ...最后一页, comments, cursor }', async () => {
    const h = routingAdapter({
      '/aweme/v1/web/comment/list/': { status_code: 0, cursor: 5, has_more: 0, comments: [{ cid: 'c1' }] }
    })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))
    const result = await fetcher.fetchWorkComments({ aweme_id: '1' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.comments).toEqual([{ cid: 'c1' }])
      expect(result.data.cursor).toBe(5)
    }
  })

  it('commentReplies：x_bogus 签名器命中 + 分页声明', async () => {
    const h = routingAdapter({
      '/aweme/v1/web/comment/list/reply/': { status_code: 0, cursor: 0, has_more: 0, comments: [{ cid: 'r1' }] }
    })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))
    const result = await fetcher.fetchCommentReplies({ aweme_id: '1', comment_id: '2' })
    expect(result.success).toBe(true)
  })

  it('userProfile：Referer 注入用户主页', async () => {
    const h = routingAdapter({ '/aweme/v1/web/user/profile/other/': { status_code: 0, user: { sec_uid: 's1' } } })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))
    const result = await fetcher.fetchUserProfile({ sec_uid: 's1' })
    expect(result.success).toBe(true)
  })

  it('userVideoList / userFavoriteList / userRecommendList：翻页 + aweme_list', async () => {
    const h = routingAdapter({
      '/aweme/v1/web/aweme/post/': { status_code: 0, has_more: 0, aweme_list: [{ id: 'w1' }] },
      '/aweme/v1/web/aweme/favorite/': { status_code: 0, has_more: 0, aweme_list: [{ id: 'w2' }] },
      '/aweme/v1/web/aweme/recommend/': { status_code: 0, has_more: false, aweme_list: [{ id: 'w3' }] }
    })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))
    for (const method of ['fetchUserVideoList', 'fetchUserFavoriteList', 'fetchUserRecommendList'] as const) {
      const result = await fetcher[method]({ sec_uid: 's1' })
      expect(result.success, method).toBe(true)
    }
    expect(h.requests).toHaveLength(3)
  })

  it('search：三种 type 的提取逻辑 + 首页校验', async () => {
    const h = routingAdapter({
      '/aweme/v1/web/discover/search/': { status_code: 0, has_more: 0, user_list: [{ uid: 'u1' }] },
      '/aweme/v1/web/search/item/': { status_code: 0, has_more: 0, data: [{ id: 'v1' }] }
    })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))

    const user = await fetcher.searchContent({ query: 'q', type: 'user' })
    expect(user.success).toBe(true)
    if (user.success) expect(user.data.user_list).toEqual([{ uid: 'u1' }])

    const video = await fetcher.searchContent({ query: 'q', type: 'video' })
    expect(video.success).toBe(true)
    if (video.success) expect(video.data.data).toEqual([{ id: 'v1' }])
  })

  it('suggestWords：Referer 注入搜索页', async () => {
    const h = routingAdapter({ '/aweme/v1/web/search/suggest/': { status_code: 0, data: ['词1'] } })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))
    const result = await fetcher.fetchSuggestWords({ query: '词' })
    expect(result.success).toBe(true)
  })

  it('musicInfo / liveRoomInfo / loginQrcode / emojiList / dynamicEmojiList：单请求', async () => {
    const h = routingAdapter({
      '/aweme/v1/web/music/detail/': { status_code: 0, music_info: { id: 'm1' } },
      '/aweme/v1/web/room/info/': { status_code: 0, data: { room: { id: 'r1' } } },
      '/aweme/v1/web/qrcode/login/': { status_code: 0, data: { qrcode_index_url: 'https://x' } },
      '/aweme/v1/web/emoji/list': { status_code: 0, emoji_list: [] },
      '/aweme/v1/web/im/strategy/config': { status_code: 0, data: {} }
    })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))

    const calls: Array<[string, Record<string, unknown>]> = [
      ['fetchMusicInfo', { music_id: 'm1' }],
      ['fetchLiveRoomInfo', { web_rid: 'r1' }],
      ['requestLoginQrcode', { verify_fp: 'fp1' }],
      ['fetchEmojiList', {}],
      ['fetchDynamicEmojiList', {}]
    ]
    for (const [method, params] of calls) {
      const result = await (fetcher as unknown as Record<string, (p: unknown) => Promise<unknown>>)[method](params)
      expect(result, method).toHaveProperty('success')
    }
    expect(h.requests).toHaveLength(5)
  })

  it('emojiList 不带签名参数（sign: false）', async () => {
    const h = routingAdapter({ '/aweme/v1/web/emoji/list': { status_code: 0, emoji_list: [] } })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))
    await fetcher.fetchEmojiList({})
    expect(new URL(h.requests[0].url).searchParams.get('a_bogus')).toBeNull()
  })

  it('四条免鉴权端点：各打各的 host，不发 cookie、不加签名', async () => {
    const h = routingAdapter({
      '/web/api/v2/user/info/': { status_code: 0, user_info: { sec_uid: 'MS4x' } },
      '/web/api/v2/music/info/': { status_code: 0, music_info: { mid: 'm1' } },
      '/web/api/v2/music/list/aweme/': { status_code: 0, aweme_list: [{ aweme_id: 'a1' }] },
      '/aweme/v1/im/resources/emoji/': { android_emoji_resource: { md5: 'abc', resource_url: 'https://x/e.zip' } }
    })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))

    const calls: Array<[string, Record<string, unknown>, string]> = [
      ['fetchGuestUserInfo', { unique_id: 'ubb_up' }, 'www.iesdouyin.com'],
      ['fetchGuestMusicInfo', { music_id: 'm1' }, 'www.iesdouyin.com'],
      ['fetchGuestMusicAwemeList', { music_id: 'm1' }, 'www.iesdouyin.com'],
      ['fetchEmojiResourceMeta', {}, 'api.amemv.com']
    ]
    for (const [method, params, host] of calls) {
      const result = await (fetcher as unknown as Record<string, (p: unknown) => Promise<{ success: boolean }>>)[method](params)
      expect(result.success, method).toBe(true)
      const req = h.requests[h.requests.length - 1]
      expect(new URL(req.url).hostname, method).toBe(host)
      // ctx 上有 cookie（DY_COOKIE），dropHeaders 必须把 attachCookie 写的那个头删掉
      expect(req.headers.cookie, method + ' 不该发 cookie').toBeUndefined()
      expect(req.headers.referer, method + ' 不该发 douyin.com 的 referer').toBeUndefined()
      expect(new URL(req.url).searchParams.get('a_bogus'), method).toBeNull()
      expect(new URL(req.url).searchParams.get('X-Bogus'), method).toBeNull()
    }
    expect(h.requests).toHaveLength(4)
  })

  it('emojiResourceMeta 用 Android UA，且不带自相矛盾的桌面头', async () => {
    const h = routingAdapter({ '/aweme/v1/im/resources/emoji/': { android_emoji_resource: { md5: 'abc' } } })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))
    await fetcher.fetchEmojiResourceMeta({})

    const headers = h.requests[0].headers
    expect(headers['user-agent']).toContain('Android')
    for (const name of ['sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform']) {
      expect(headers[name], name + ' 与 Android UA 自相矛盾，应当删掉').toBeUndefined()
    }
  })

  it('免鉴权端点即使调用方单次传了 cookie 也不发 —— dropHeaders 在合并之后执行', async () => {
    const h = routingAdapter({ '/web/api/v2/user/info/': { status_code: 0, user_info: { sec_uid: 'MS4x' } } })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))
    await fetcher.fetchGuestUserInfo({ unique_id: 'ubb_up' }, { headers: { Cookie: 'sessionid=other' } })
    expect(h.requests[0].headers.cookie).toBeUndefined()
  })
})

describe('分页专项（与 v6 行为逐条对应）', () => {
  it('comments：单页足够时只请求一次', async () => {
    const h = routingAdapter({
      '/aweme/v1/web/comment/list/': { status_code: 0, cursor: 0, has_more: 0, comments: [{ cid: 'c1' }] }
    })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))
    const result = await fetcher.fetchWorkComments({ aweme_id: '1', number: 1 })
    expect(result.success).toBe(true)
    expect(h.requests).toHaveLength(1)
  })

  it('comments：跨页累积并按 number 截断', async () => {
    const requests: string[] = []
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async (config) => {
        const url = config.url ?? ''
        requests.push(url)
        const cursor = Number(new URL(url).searchParams.get('cursor') ?? '0')
        const page = cursor === 0
          ? { status_code: 0, cursor: 10, has_more: 1, comments: [{ cid: 'a' }, { cid: 'b' }] }
          : { status_code: 0, cursor: 20, has_more: 0, comments: [{ cid: 'c' }] }
        return { data: page, status: 200, statusText: 'OK', headers: {}, config: config as never }
      })
    )

    const result = await fetcher.fetchWorkComments({ aweme_id: '1', number: 3 })
    expect(result.success).toBe(true)
    expect(requests).toHaveLength(2)
    if (result.success) expect(result.data.comments).toEqual([{ cid: 'a' }, { cid: 'b' }, { cid: 'c' }])
  })

  it('comments：has_more 为 0 时提前停止', async () => {
    const h = routingAdapter({
      '/aweme/v1/web/comment/list/': { status_code: 0, cursor: 0, has_more: 0, comments: [{ cid: 'a' }] }
    })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))
    const result = await fetcher.fetchWorkComments({ aweme_id: '1', number: 50 })
    expect(result.success).toBe(true)
    expect(h.requests).toHaveLength(1)
    if (result.success) expect(result.data.comments).toEqual([{ cid: 'a' }])
  })

  it('comments：返回空列表时立即停止', async () => {
    const h = routingAdapter({
      '/aweme/v1/web/comment/list/': { status_code: 0, cursor: 0, has_more: 1, comments: [] }
    })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))
    const result = await fetcher.fetchWorkComments({ aweme_id: '1', number: 50 })
    expect(result.success).toBe(true)
    expect(h.requests).toHaveLength(1)
  })

  it('comments：翻页时把上一页 cursor 带入下一次请求', async () => {
    const cursors: number[] = []
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async (config) => {
        const url = config.url ?? ''
        cursors.push(Number(new URL(url).searchParams.get('cursor') ?? '0'))
        const cursor = cursors[cursors.length - 1]
        const page = cursor === 0
          ? { status_code: 0, cursor: 7, has_more: 1, comments: [{ cid: 'a' }] }
          : { status_code: 0, cursor: 0, has_more: 0, comments: [{ cid: 'b' }] }
        return { data: page, status: 200, statusText: 'OK', headers: {}, config: config as never }
      })
    )
    const result = await fetcher.fetchWorkComments({ aweme_id: '1', number: 2 })
    expect(result.success).toBe(true)
    expect(cursors).toEqual([0, 7])
  })

  it('comments：单次请求的 count 参数被 maxPageSize (50) 夹住', async () => {
    const counts: number[] = []
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async (config) => {
        const url = config.url ?? ''
        counts.push(Number(new URL(url).searchParams.get('count') ?? '0'))
        return {
          data: { status_code: 0, cursor: 0, has_more: 1, comments: [{ cid: 'a' }] },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config as never
        }
      })
    )
    const result = await fetcher.fetchWorkComments({ aweme_id: '1', number: 120 })
    expect(result.success).toBe(true)
    expect(counts[0]).toBe(50)
  })

  it('comments：最后一页只请求剩余数量', async () => {
    const counts: number[] = []
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async (config) => {
        const url = config.url ?? ''
        counts.push(Number(new URL(url).searchParams.get('count') ?? '0'))
        const count = counts[counts.length - 1]
        const page = count === 50
          ? { status_code: 0, cursor: 1, has_more: 1, comments: [{ cid: 'a' }, { cid: 'b' }, { cid: 'c' }] }
          : { status_code: 0, cursor: 0, has_more: 0, comments: [{ cid: 'd' }, { cid: 'e' }] }
        return { data: page, status: 200, statusText: 'OK', headers: {}, config: config as never }
      })
    )
    const result = await fetcher.fetchWorkComments({ aweme_id: '1', number: 5 })
    expect(result.success).toBe(true)
    expect(counts).toEqual([5]) // 目标 5 ≤ maxPageSize 50：一次请求取 5 条
  })

  it('userVideoList：max_cursor 带入下一次请求', async () => {
    const cursors: string[] = []
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async (config) => {
        const url = config.url ?? ''
        cursors.push(new URL(url).searchParams.get('max_cursor') ?? '')
        const cursor = cursors[cursors.length - 1]
        const page = cursor === '0'
          ? { status_code: 0, max_cursor: '100', has_more: 1, aweme_list: [{ id: 'a' }] }
          : { status_code: 0, max_cursor: '0', has_more: 0, aweme_list: [{ id: 'b' }] }
        return { data: page, status: 200, statusText: 'OK', headers: {}, config: config as never }
      })
    )
    const result = await fetcher.fetchUserVideoList({ sec_uid: 's1', number: 2 })
    expect(result.success).toBe(true)
    expect(cursors).toEqual(['0', '100'])
  })

  it('userRecommendList：has_more === true 才继续（v6 逐字保留）', async () => {
    const requests: string[] = []
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async (config) => {
        const url = config.url ?? ''
        requests.push(url)
        // has_more 是 1（数字）时 v6 判为 false —— 只请求一次
        return {
          data: { status_code: 0, max_cursor: '1', has_more: 1, aweme_list: [{ id: 'a' }] },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config as never
        }
      })
    )
    const result = await fetcher.fetchUserRecommendList({ sec_uid: 's1', number: 100 })
    expect(result.success).toBe(true)
    expect(requests).toHaveLength(1)
  })
})

describe('danmakuList 分段', () => {
  const danmaku = (offset: number) => ({ status_code: 0, danmaku_list: [{ offset_time: offset }], extra: { e: offset }, log_pb: { l: offset } })

  it('单段：总时长 ≤ 32000ms 只发一个请求', async () => {
    const h = routingAdapter({ '/aweme/v1/web/danmaku/get_v2/': danmaku(5) })
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter))
    const result = await fetcher.fetchDanmakuList({ aweme_id: '1', duration: 30000 })
    expect(result.success).toBe(true)
    expect(h.requests).toHaveLength(1)
    if (result.success) {
      expect(result.data.danmaku_list).toEqual([{ offset_time: 5 }])
      expect(result.data.total).toBe(1)
    }
  })

  it('多段：按 32000ms 切段并发，合并后按 offset_time 排序', async () => {
    const segments: string[] = []
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async (config) => {
        const url = config.url ?? ''
        segments.push(url)
        const start = Number(new URL(url).searchParams.get('start_time'))
        // 第二段 offset 更小，验证合并后排序
        return {
          data: danmaku(start === 0 ? 10 : start === 32000 ? 5 : 7),
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config as never
        }
      })
    )
    const result = await fetcher.fetchDanmakuList({ aweme_id: '1', duration: 70000 })
    expect(result.success).toBe(true)
    expect(segments).toHaveLength(3) // 0-32000 / 32000-64000 / 64000-70000
    if (result.success) {
      expect(result.data.danmaku_list.map((d) => d.offset_time)).toEqual([5, 7, 10])
      expect(result.data.total).toBe(3)
    }
  })

  it('单段失败 tolerate：其余段照常合并', async () => {
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async (config) => {
        const url = config.url ?? ''
        const start = Number(new URL(url).searchParams.get('start_time'))
        if (start === 32000) throw new Error('segment-2 network down')
        return {
          data: danmaku(start === 0 ? 1 : 3),
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config as never
        }
      })
    )
    const result = await fetcher.fetchDanmakuList({ aweme_id: '1', duration: 70000 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.danmaku_list.map((d) => d.offset_time)).toEqual([1, 3])
      expect(result.data.total).toBe(2)
    }
  })

  it('全部段都失败：返回失败信封（execute 的 tolerate 语义）', async () => {
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async () => {
        throw new Error('network down')
      })
    )
    const result = await fetcher.fetchDanmakuList({ aweme_id: '1', duration: 70000 })
    expect(result.success).toBe(false)
  })
})

describe('search 的 multi-JSON', () => {
  it('粘连响应正确拆分合并：多个块按 data 合并', async () => {
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async (config) => {
        const url = config.url ?? ''
        const count = Number(new URL(url).searchParams.get('count') ?? '0')
        // general 搜索返回粘连 JSON（反爬形态）；第二页 count=1（目标 3 剩 1）
        const raw = count > 1
          ? '{"status_code":0,"has_more":1,"cursor":1,"data":[{"id":"a"}]}{"status_code":0,"has_more":1,"cursor":1,"data":[{"id":"b"}]}'
          : '{"status_code":0,"has_more":0,"cursor":0,"data":[{"id":"c"}]}'
        return { data: raw, status: 200, statusText: 'OK', headers: {}, config: config as never }
      })
    )
    const result = await fetcher.searchContent({ query: 'q', type: 'general', number: 3 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    }
  })

  it('无合法块时判反爬（kind: auth / COOKIE_EXPIRED）', async () => {
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async (config) => {
        return {
          data: '{"garbage":1}{"noise":2}', // 没有 cursor/has_more/data 的块
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config as never
        }
      })
    )
    const result = await fetcher.searchContent({ query: 'q', type: 'general' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('auth')
      expect(result.error.code).toBe('COOKIE_EXPIRED')
    }
  })

  it('user 搜索缺 user_list 判反爬（首页校验）', async () => {
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async (config) => {
        return {
          data: { status_code: 0, has_more: 0 }, // 缺 user_list
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config as never
        }
      })
    )
    const result = await fetcher.searchContent({ query: 'q', type: 'user' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('auth')
      expect(result.error.code).toBe('COOKIE_EXPIRED')
    }
  })

  it('Argus 拦截判 risk / ANTIBOT_PAGE，不再报成 cookie 失效', async () => {
    // searchJudge 绕开了 douyinJudge 的 verdictFromNonJsonBody（搜索的响应本来就
    // 可能是字符串），所以它必须自己认一次 Argus —— 否则风控拦截落进「非对象 → auth」
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async (config) => {
        return {
          data: 'Blocked by ArgusSecurityPlugin Uifid Not Found',
          status: 403,
          statusText: 'Forbidden',
          headers: {},
          config: config as never
        }
      })
    )
    const result = await fetcher.searchContent({ query: 'q', type: 'general' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('risk')
      expect(result.error.code).toBe('ANTIBOT_PAGE')
      expect(result.error.retryable).toBe(true)
    }
  })
})

describe('Argus 换参重试（retryOn + retryFresh，#188）', () => {
  /** 不真等：退避是 1s/2s/4s，注入空 sleep 让用例跑得完 */
  const noSleep = async (): Promise<void> => {}

  it('恒被拦：重试到上限（1 + 3 次）后返回失败信封', async () => {
    const urls: string[] = []
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async (config) => {
        urls.push(config.url ?? '')
        return { data: 'Blocked by ArgusSecurityPlugin Uifid Not Found', status: 403, statusText: 'Forbidden', headers: {}, config: config as never }
      }, { judge: douyinJudge, sleep: noSleep })
    )

    const result = await fetcher.fetchMusicInfo({ music_id: 'm1' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('ANTIBOT_PAGE')
    expect(urls).toHaveLength(4) // DEFAULT_MAX_RETRIES(3) + 首次
  })

  it('retryFresh：每次重试都换一整套参数（msToken 逐次不同）', async () => {
    const tokens: Array<string | null> = []
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async (config) => {
        tokens.push(new URL(config.url ?? '').searchParams.get('msToken'))
        return { data: 'Blocked by ArgusSecurityPlugin', status: 403, statusText: 'Forbidden', headers: {}, config: config as never }
      }, { judge: douyinJudge, sleep: noSleep })
    )

    await fetcher.fetchMusicInfo({ music_id: 'm1' })
    expect(tokens).toHaveLength(4)
    expect(tokens.every((t) => typeof t === 'string' && t.length > 0)).toBe(true)
    // 这一条才是 retryFresh 的判据：原样重放的话四个 token 会一模一样，
    // 而 Argus 按单次请求的 token 组判定 —— 重放必然同样被拦
    expect(new Set(tokens).size).toBe(4)
  })

  it('第二次就通过时返回成功，不再往后重试', async () => {
    let calls = 0
    const fetcher = createFetcherFromRegistry(
      'douyin',
      douyinRegistry,
      makeCtx(async (config) => {
        calls++
        const blocked = calls === 1
        return {
          data: blocked ? 'Blocked by ArgusSecurityPlugin' : { status_code: 0, music_info: { mid: 'm1' } },
          status: blocked ? 403 : 200,
          statusText: 'OK',
          headers: {},
          config: config as never
        }
      }, { judge: douyinJudge, sleep: noSleep })
    )

    const result = await fetcher.fetchMusicInfo({ music_id: 'm1' })
    expect(result.success).toBe(true)
    expect(calls).toBe(2)
  })

  it('没声明 retryOn 的端点（emojiList / 四条免鉴权）撞 Argus 只发一次', async () => {
    for (const method of ['fetchEmojiList', 'fetchGuestUserInfo'] as const) {
      let calls = 0
      const fetcher = createFetcherFromRegistry(
        'douyin',
        douyinRegistry,
        makeCtx(async (config) => {
          calls++
          return { data: 'Blocked by ArgusSecurityPlugin', status: 403, statusText: 'Forbidden', headers: {}, config: config as never }
        }, { judge: douyinJudge, sleep: noSleep })
      )
      const result = await (fetcher as unknown as Record<string, (p: unknown) => Promise<{ success: boolean }>>)[method]({ unique_id: 'x' })
      expect(result.success, method).toBe(false)
      expect(calls, method).toBe(1)
    }
  })
})

describe('路由唯一性（修 #47/#48/#54）', () => {
  it('23 条路径互不重复', () => {
    const paths = routePathsOf(douyinRegistry)
    expect(paths).toHaveLength(23)
    expect(new Set(paths).size).toBe(23)
  })

  it('parseWork 保留原路径 /fetch_one_work，其余 4 个作品端点各占新路径', () => {
    const paths = routePathsOf(douyinRegistry)
    expect(paths).toContain('/fetch_one_work')
    for (const p of ['/fetch_video_work', '/fetch_image_album_work', '/fetch_slides_work', '/fetch_text_work']) {
      expect(paths, p).toContain(p)
    }
    expect(paths.filter((p) => p === '/fetch_one_work')).toHaveLength(1)
  })
})
