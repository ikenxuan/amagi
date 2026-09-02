import { createFetcherFromRegistry } from 'amagi/client/fetcher'
import type { ClientCtx } from 'amagi/client/fetcher'
import { kuaishouRegistry } from 'amagi/platforms/kuaishou/endpoints'
import { createKuaishouSigner } from 'amagi/platforms/kuaishou/sign'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
import type { AxiosAdapter } from 'axios'
import { describe, expect, it } from 'vitest'
/**
 * 阶段门 2 判据：**6 个端点各有一条端到端用例**（adapter 注入，不发真实请求），
 * 另加 `userProfile` 的 12 请求聚合专项（全成功 / 部分失败 tolerate /
 * `attempts === 12`）。
 */

const KS_COOKIE = 'kwfv1=TOKEN123; did=web_abc'

/** 注入 adapter 的 ClientCtx（签名器随实例，避免模块级状态干扰） */
const makeCtx = (adapter: AxiosAdapter): ClientCtx => {
  const trace = new TraceCollector()
  const http = new HttpClient({ trace, requestConfig: { adapter } })
  return {
    clientId: 'client-1',
    platform: 'kuaishou',
    cookie: KS_COOKIE,
    userAgent: 'ua/1',
    requestConfig: {},
    trace,
    signers: { 'kuaishou-hxfalcon': (spec) => spec }, // 端到端用例不验签，直通
    judge: undefined,
    send: (spec, reason) => http.send(spec, reason)
  }
}

/** 按 URL 分发响应的 adapter，记录请求 */
const routingAdapter = (responses: Record<string, unknown>): { adapter: AxiosAdapter; requests: Array<{ method?: string; url: string; body?: unknown }> } => {
  const requests: Array<{ method?: string; url: string; body?: unknown }> = []
  return {
    adapter: async (config) => {
      const url = config.url ?? ''
      const path = new URL(url).pathname
      requests.push({ method: config.method, url, body: config.data })
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

describe('kuaishou 6 个端点端到端', () => {
  it('videoWork：graphql POST + body 含 operationName/query/variables', async () => {
    const h = routingAdapter({ '/graphql': { data: { visionVideoDetail: { status: 1, type: 'video' } } } })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchVideoWork({ photoId: 'p1' })
    expect(result.success).toBe(true)
    const req = h.requests[0]
    expect(req.method).toBe('post')
    expect(req.url).toContain('/graphql')
    const body = JSON.parse(req.body as string) as { operationName?: string; query?: string; variables?: unknown }
    expect(body.operationName).toBe('visionVideoDetail')
    expect(body.query).toBeTruthy()
    expect(body.variables).toBeTruthy()
  })

  it('comments：graphql POST，number 触发翻页（#57 补 pcursor/count）', async () => {
    const page1 = { data: { visionCommentList: { commentCount: 3, pcursor: 'next-1', rootComments: [{ commentId: 'c1' }, { commentId: 'c2' }] } } }
    const page2 = { data: { visionCommentList: { commentCount: 3, pcursor: '', rootComments: [{ commentId: 'c3' }] } } }
    const requests: string[] = []
    const fetcher = createFetcherFromRegistry(
      'kuaishou',
      kuaishouRegistry,
      makeCtx(async (config) => {
        const url = config.url ?? ''
        requests.push(url)
        const body = JSON.parse((config.data ?? '{}') as string) as { variables?: { pcursor?: string } }
        const pcursor = body.variables?.pcursor ?? ''
        const page = pcursor === '' ? page1 : page2
        return { data: page, status: 200, statusText: 'OK', headers: {}, config: config as never }
      })
    )

    const result = await fetcher.fetchWorkComments({ photoId: 'p1', number: 3 })
    expect(result.success).toBe(true)
    expect(requests).toHaveLength(2)
    expect(result).toHaveProperty('meta')
  })

  it('userProfile：12 个并发请求，attempts === 12（全成功）', async () => {
    const ok = { data: { result: 1 } }
    const h = routingAdapter({
      '/live_api/baseuser/userinfo/byid': { data: { result: 1, userInfo: { id: 'u1', name: '主播' } } },
      '/live_api/baseuser/userinfo/sensitive': { data: { result: 1, sensitiveUserInfo: { followStatus: 'FOLLOWING' } } },
      '/live_api/profile/public': { data: { result: 1, list: [{ id: 'w1' }], pcursor: '' } },
      '/live_api/profile/private': ok,
      '/live_api/profile/liked': ok,
      '/live_api/playback/list': ok,
      '/live_api/profile/interestlist': { data: [{ id: 'i1' }] },
      '/live_api/interestMask/list': { data: [] },
      '/live_api/category/config': { data: [] },
      '/live_api/category/data': { data: { list: [] } },
      '/live_api/category/classify': { data: { list: [] } },
      '/live_api/liveroom/livedetail': ok
    })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchUserProfile({ principalId: 'u1' })
    expect(result.success).toBe(true)
    expect(h.requests).toHaveLength(12)
    if (result.success) {
      expect(result.meta.attempts).toBe(12) // 阶段门 2 专项判据
      const data = result.data as unknown as { author: { userInfo: { name: string } }; follow: { currentFollowStatus: string } | null }
      expect(data.author.userInfo.name).toBe('主播')
      expect(data.follow?.currentFollowStatus).toBe('FOLLOWING')
    }
  })

  it('userProfile：部分失败 tolerate，其余字段回退空值', async () => {
    const ok = { data: { result: 1 } }
    const h = routingAdapter({
      '/live_api/baseuser/userinfo/byid': ok,
      // sensitive 失败（返回 ErrorDetail 形状）
      '/live_api/baseuser/userinfo/sensitive': { amagiError: { errorDescription: 'x', requestType: 'userProfile', requestUrl: 'u' } },
      '/live_api/profile/public': { data: { result: 1, list: [], pcursor: '' } },
      '/live_api/profile/private': ok,
      '/live_api/profile/liked': ok,
      '/live_api/playback/list': ok,
      '/live_api/profile/interestlist': { data: [] },
      '/live_api/interestMask/list': { data: [] },
      '/live_api/category/config': { data: [] },
      '/live_api/category/data': { data: { list: [] } },
      '/live_api/category/classify': { data: { list: [] } },
      '/live_api/liveroom/livedetail': ok
    })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchUserProfile({ principalId: 'u1' })
    expect(result.success).toBe(true) // tolerate：整体仍成功
    expect(h.requests).toHaveLength(12)
    if (result.success) {
      const data = result.data as { follow: unknown; author: { sensitiveInfo: unknown } }
      expect(data.follow).toBeNull() // sensitive 失败 -> follow 回退 null
      expect(data.author.sensitiveInfo).toBeNull()
    }
  })

  it('userProfile：全部失败时返回失败信封（partial 语义）', async () => {
    // adapter 抛传输错误（网络层全挂），tolerate 下所有分片都失败 -> 整体失败信封
    const fetcher = createFetcherFromRegistry(
      'kuaishou',
      kuaishouRegistry,
      makeCtx(async () => {
        throw new Error('network down')
      })
    )

    const result = await fetcher.fetchUserProfile({ principalId: 'u1' })
    expect(result.success).toBe(false)
  })

  it('userWorkList：count 用 coerce（#58），字符串可传', async () => {
    const h = routingAdapter({ '/live_api/profile/public': { data: { result: 1, list: [{ id: 'w1' }], pcursor: '' } } })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchUserWorkList({ principalId: 'u1', number: '5' as unknown as number })
    expect(result.success).toBe(true)
    expect(h.requests[0].url).toContain('count=5')
  })

  it('liveRoomInfo：live_api GET 走通', async () => {
    const h = routingAdapter({ '/live_api/liveroom/livedetail': { data: { result: 1, liveStream: { id: 'L1' } } } })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchLiveRoomInfo({ principalId: 'u1' })
    expect(result.success).toBe(true)
    expect(h.requests[0].url).toContain('/live_api/liveroom/livedetail')
  })

  it('emojiList：graphql POST 无参数', async () => {
    const h = routingAdapter({ '/graphql': { data: { visionBaseEmoticons: { iconUrls: [] } } } })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchEmojiList()
    expect(result.success).toBe(true)
    expect(h.requests[0].url).toContain('/graphql')
  })
})

describe('kuaishou registry 结构', () => {
  it('registry 恰好 6 个端点', () => {
    expect(Object.keys(kuaishouRegistry)).toHaveLength(6)
  })

  it('路由与 v6 逐条一致', () => {
    const routes = Object.values(kuaishouRegistry).map((d) => d.route).sort()
    expect(routes).toEqual([
      '/fetch_emoji_list',
      '/fetch_live_room_info',
      '/fetch_one_work',
      '/fetch_user_profile',
      '/fetch_user_work_list',
      '/fetch_work_comments'
    ])
  })
})

describe('kuaishou 签名器接线', () => {
  it('createKuaishouSigner 实例可注入 signers 表，签名状态随实例', () => {
    const signer = createKuaishouSigner()
    expect(typeof signer.signLiveApiUrl).toBe('function')
    expect(signer.getCatVersion()).toBeTruthy()
  })
})