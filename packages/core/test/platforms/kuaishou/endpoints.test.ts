import { createFetcherFromRegistry } from 'amagi/client/fetcher'
import type { ClientCtx } from 'amagi/client/fetcher'
import { kuaishouRegistry } from 'amagi/platforms/kuaishou/endpoints'
import { createKuaishouSigner } from 'amagi/platforms/kuaishou/sign'
import { createKuaishouSigners } from 'amagi/platforms/kuaishou/sign/signers'
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
    // 用真表而不是直通桩：端点声明 `sign: 'hxfalcon'` 之后，桩会让「签名到底
    // 有没有发生」重新变成不可观测的（这正是这些端点长期不签名却没人发现的原因）
    signers: createKuaishouSigners(),
    judge: undefined,
    send: (spec, reason) => http.send(spec, reason)
  }
}

/** 按 URL 分发响应的 adapter，记录请求 */
const routingAdapter = (
  responses: Record<string, unknown>
): { adapter: AxiosAdapter; requests: Array<{ method?: string; url: string; body?: unknown; cookie?: string }> } => {
  const requests: Array<{ method?: string; url: string; body?: unknown; cookie?: string }> = []
  return {
    adapter: async (config) => {
      const url = config.url ?? ''
      const path = new URL(url).pathname
      const headers = config.headers as Record<string, unknown> | undefined
      requests.push({
        method: config.method,
        url,
        body: config.data,
        cookie: (headers?.Cookie ?? headers?.cookie) as string | undefined
      })
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

describe('kuaishou 7 个端点端到端', () => {
  it('videoWork：H5 photo/info POST，14 个键的 body 原样发出且参与签名', async () => {
    const h = routingAdapter({ '/rest/wd/photo/info': { result: 1, photo: { id: 'p1' } } })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchVideoWork({ photoId: 'p1' })
    expect(result.success).toBe(true)
    const req = h.requests[0]
    expect(req.method).toBe('post')
    expect(req.url).toContain('c.kuaishou.com/rest/wd/photo/info')
    // 签名产物在 URL 上，body 是签名的输入之一
    expect(new URL(req.url).searchParams.get('__NS_hxfalcon')).toBeTruthy()
    const body = JSON.parse(req.body as string) as Record<string, unknown>
    expect(Object.keys(body)).toHaveLength(14)
    expect(body.photoId).toBe('p1')
    expect(body.env).toBe('SHARE_VIEWER_ENV_TX_TRICK')
  })

  it('videoWork：prepare 把 did 写进 Cookie 头（零配置也有设备号）', async () => {
    const h = routingAdapter({ '/rest/wd/photo/info': { result: 1 } })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    await fetcher.fetchVideoWork({ photoId: 'p1' })

    const cookie = h.requests[0].cookie ?? ''
    expect(cookie).toMatch(/^did=web_[0-9a-f]{32}; didv=\d+/)
    // 用户配的 cookie 追加在后面，不被顶掉
    expect(cookie).toContain(KS_COOKIE)
  })

  it('videoWorkSimple：免签兜底 —— 不签名、body 只有 photoId', async () => {
    const h = routingAdapter({ '/rest/wd/ugH5App/photo/simple/info': { result: 1, photo: { id: 'p1' } } })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchVideoWorkSimple({ photoId: 'p1' })
    expect(result.success).toBe(true)
    const req = h.requests[0]
    expect(req.url).toBe('https://c.kuaishou.com/rest/wd/ugH5App/photo/simple/info')
    // 关键：URL 上不能有签名产物 —— 它的存在意义就是「签名失效了也能用」
    expect(req.url).not.toContain('__NS_hxfalcon')
    expect(JSON.parse(req.body as string)).toEqual({ photoId: 'p1' })
  })

  it('comments：H5 comment/list POST，number 触发翻页（#57 补 pcursor/count）', async () => {
    const page1 = { result: 1, commentCount: 3, pcursor: 'next-1', rootComments: [{ comment_id: 'c1' }, { comment_id: 'c2' }] }
    const page2 = { result: 1, commentCount: 3, pcursor: '', rootComments: [{ comment_id: 'c3' }] }
    const requests: string[] = []
    const fetcher = createFetcherFromRegistry(
      'kuaishou',
      kuaishouRegistry,
      makeCtx(async (config) => {
        const url = config.url ?? ''
        requests.push(url)
        const body = JSON.parse((config.data ?? '{}') as string) as { pcursor?: string }
        const page = (body.pcursor ?? '') === '' ? page1 : page2
        return { data: page, status: 200, statusText: 'OK', headers: {}, config: config as never }
      })
    )

    const result = await fetcher.fetchWorkComments({ photoId: 'p1', number: 3 })
    expect(result.success).toBe(true)
    expect(requests).toHaveLength(2)
    expect(result).toHaveProperty('meta')
    // 翻页参数在 body 里（放 query 会拿到 result=1 但 0 条）
    expect(new URL(requests[0]).searchParams.get('pcursor')).toBeNull()
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
  it('registry 恰好 7 个端点', () => {
    expect(Object.keys(kuaishouRegistry)).toHaveLength(7)
  })

  it('路由：v6 那 6 条逐条一致，另加 H5 迁移新增的免签兜底', () => {
    const routes = Object.values(kuaishouRegistry)
      .map((d) => d.route)
      .sort()
    expect(routes).toEqual([
      '/fetch_emoji_list',
      '/fetch_live_room_info',
      '/fetch_one_work',
      // 新增：签名失效时的降级入口，不参与签名
      '/fetch_one_work_simple',
      '/fetch_user_profile',
      '/fetch_user_work_list',
      '/fetch_work_comments'
    ])
  })
})

describe('kuaishou 签名器接线', () => {
  it('端点声明 sign 之后，最终发出的 URL 真的带 __NS_hxfalcon 与 caver', async () => {
    const h = routingAdapter({ '/rest/k/live_api/liveroom/livedetail': { result: 1, data: {} } })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    await fetcher.fetchLiveRoomInfo({ principalId: 'u1' })

    const sent = new URL(h.requests[0].url)
    expect(sent.searchParams.get('__NS_hxfalcon')).toMatch(/^HUDR_.+\$HE_[0-9a-f]+$/)
    expect(sent.searchParams.get('caver')).toBe(createKuaishouSigner().getCatVersion())
  })

  it('聚合端点的每一个分片都签到（12 个请求，一个都不能漏）', async () => {
    const h = routingAdapter({})
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    await fetcher.fetchUserProfile({ principalId: 'u1' })

    expect(h.requests).toHaveLength(12)
    for (const req of h.requests) {
      expect(new URL(req.url).searchParams.get('__NS_hxfalcon'), `${req.url} 没签名`).toBeTruthy()
    }
  })

  it('签名各不相同 —— count 随实例递增，12 个分片不是同一个签名复制 12 份', async () => {
    const h = routingAdapter({})
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    await fetcher.fetchUserProfile({ principalId: 'u1' })

    const signatures = h.requests.map((r) => new URL(r.url).searchParams.get('__NS_hxfalcon'))
    expect(new Set(signatures).size).toBe(12)
  })

  it('请求体参与签名 —— sign input 尾部就是 JSON.stringify(body)', () => {
    const signer = createKuaishouSigner()
    const url = 'https://c.kuaishou.com/rest/wd/photo/info?kpn=NEBULA&caver=2'
    const body = { photoId: 'p1', isLongVideo: false }

    const withBody = signer.signLiveApiUrl(url, undefined, '/rest/wd/photo/info', body)
    const without = signer.signLiveApiUrl(url, undefined, '/rest/wd/photo/info')

    // 这是那条死分支复活的唯一证明：`buildKuaishouHxfalconPayload` 原先把
    // requestBody 硬编码成 `{}`，于是 `length > 0` 永远为假，body 从不进 sign input。
    // `photo/info` 严格校验签名，body 不参与就一律 `result=50`。
    expect(withBody.signInput.endsWith(JSON.stringify(body))).toBe(true)
    expect(without.signInput.endsWith('}')).toBe(false)
    expect(withBody.signInput).not.toBe(without.signInput)
    // signResult 不能直接比：它掺了 count / Date.now() / Math.random()，
    // 两次调用本来就不同 —— 能证明「body 真的进去了」的只有 signInput。
    expect(withBody.signInput.slice(0, -JSON.stringify(body).length)).toBe(without.signInput)
  })

  it('kww 进请求头（匿名兜底也要有，快手签名从不依赖 cookie）', () => {
    const signer = createKuaishouSigner()
    const anonymous = signer.signLiveApiUrl('https://c.kuaishou.com/rest/wd/photo/info?caver=2')
    expect(anonymous.headers.kww).toBeTruthy()
  })
})
