import { createFetcherFromRegistry } from 'amagi/client/fetcher'
import type { ClientCtx } from 'amagi/client/fetcher'
import { parseKuaishouCaptcha } from 'amagi/platforms/kuaishou/captcha'
import { createKuaishouConfig, KUAISHOU_H5_DROP_HEADERS } from 'amagi/platforms/kuaishou/config'
import { kuaishouRegistry } from 'amagi/platforms/kuaishou/endpoints'
import { kuaishouJudge } from 'amagi/platforms/kuaishou/judge'
import { createKuaishouSigner } from 'amagi/platforms/kuaishou/sign'
import { createKuaishouSigners } from 'amagi/platforms/kuaishou/sign/signers'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
import type { AxiosAdapter } from 'axios'
import { describe, expect, it } from 'vitest'
/**
 * 阶段门 2 判据：**6 个端点各有一条端到端用例**（adapter 注入，不发真实请求），
 * 另加 `userProfile` 的 12 请求聚合专项（全成功 / 部分失败 tolerate /
 * `attempts === 12`）。阶段 5 起补 `danmakuList`（多窗口分段 + 合并去重 + `retryOn`）。
 */

const KS_COOKIE = 'kwfv1=TOKEN123'

/** 注入 adapter 的 ClientCtx（签名器随实例，避免模块级状态干扰） */
const makeCtx = (adapter: AxiosAdapter, withBaseline = false): ClientCtx => {
  const trace = new TraceCollector()
  // 默认不装平台基线：多数用例只关心端点自己声明的东西。
  // `withBaseline` 那条给 `dropHeaders` 用 —— 没有基线头就没有可删的头，
  // 断言会变成恒真（这正是「命名像守卫、内容是同义反复」那类测试的来路）
  const baseline = withBaseline ? createKuaishouConfig(KS_COOKIE, {}) : undefined
  const http = new HttpClient({
    trace,
    requestConfig: { adapter },
    ...(baseline === undefined ? {} : { headers: baseline.headers.toJSON() })
  })
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
    // 声明了 `retryOn` 的端点（danmaku）在这里不真等 1s/2s/4s
    sleep: async () => {},
    send: (spec, reason) => http.send(spec, reason)
  }
}

/** 按 URL 分发响应的 adapter，记录请求 */
const routingAdapter = (
  responses: Record<string, unknown>
): {
  adapter: AxiosAdapter
  requests: Array<{ method?: string; url: string; body?: unknown; cookie?: string; headers?: Record<string, unknown> }>
} => {
  const requests: Array<{
    method?: string
    url: string
    body?: unknown
    cookie?: string
    headers?: Record<string, unknown>
  }> = []
  return {
    adapter: async (config) => {
      const url = config.url ?? ''
      const path = new URL(url).pathname
      const headers = config.headers as Record<string, unknown> | undefined
      requests.push({
        method: config.method,
        url,
        body: config.data,
        cookie: (headers?.Cookie ?? headers?.cookie) as string | undefined,
        headers: { ...headers }
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

describe('kuaishou 8 个端点端到端', () => {
  it('videoWork：H5 免签 simple/info POST，body 只有 photoId、URL 上没有签名产物', async () => {
    const h = routingAdapter({ '/rest/wd/ugH5App/photo/simple/info': { result: 1, photo: { id: 'p1' } } })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchVideoWork({ photoId: 'p1' })
    expect(result.success).toBe(true)
    const req = h.requests[0]
    expect(req.method).toBe('post')
    expect(req.url).toBe('https://c.kuaishou.com/rest/wd/ugH5App/photo/simple/info')
    // 主通道刻意不签名：快手自己的分享页 SSR 用的就是这条免签接口
    expect(req.url).not.toContain('__NS_hxfalcon')
    expect(JSON.parse(req.body as string)).toEqual({ photoId: 'p1' })
  })

  it('videoWork：dropHeaders 把与移动 UA 矛盾的桌面基线头删掉', async () => {
    const h = routingAdapter({ '/rest/wd/ugH5App/photo/simple/info': { result: 1 } })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter, true))

    await fetcher.fetchVideoWork({ photoId: 'p1' })

    const headers = h.requests[0].headers ?? {}
    const names = new Set(Object.keys(headers).map((n) => n.toLowerCase()))
    for (const dropped of KUAISHOU_H5_DROP_HEADERS) {
      expect(names.has(dropped)).toBe(false)
    }
    // 该发的还在：移动 UA + 分享页 Referer（不然「删干净了」可以靠什么都不发达成）
    expect(String(headers['User-Agent'] ?? headers['user-agent'])).toContain('iPhone')
    expect(String(headers['Referer'] ?? headers['referer'])).toBe('https://c.kuaishou.com/fw/photo/p1')
  })

  it('videoWork：基线确实带着那些头 —— 上一条不是恒真', async () => {
    const baseline = createKuaishouConfig(KS_COOKIE, {}).headers.toJSON()
    const names = new Set(Object.keys(baseline).map((n) => n.toLowerCase()))
    for (const dropped of KUAISHOU_H5_DROP_HEADERS) {
      expect(names.has(dropped)).toBe(true)
    }
  })

  it('videoWorkFull：完整版 photo/info POST，14 个键的 body 原样发出且参与签名', async () => {
    const h = routingAdapter({ '/rest/wd/photo/info': { result: 1, photo: { id: 'p1' } } })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchVideoWorkFull({ photoId: 'p1' })
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

  it('videoWorkFull：prepare 把 did 写进 Cookie 头（零配置也有设备号）', async () => {
    const h = routingAdapter({ '/rest/wd/photo/info': { result: 1 } })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    await fetcher.fetchVideoWorkFull({ photoId: 'p1' })

    const cookie = h.requests[0].cookie ?? ''
    expect(cookie).toMatch(/^did=web_[0-9a-f]{32}; didv=\d+/)
    // 用户配的 cookie 追加在后面，不被顶掉
    expect(cookie).toContain(KS_COOKIE)
  })

  it('videoWorkFull：用户 cookie 里已有 did 时不再重复发一个自造的', async () => {
    const h = routingAdapter({ '/rest/wd/photo/info': { result: 1 } })
    const ctx = makeCtx(h.adapter)
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, {
      ...ctx,
      cookie: 'did=web_realbrowserdid; didv=123; kwfv1=TOKEN123'
    })

    await fetcher.fetchVideoWorkFull({ photoId: 'p1' })

    const cookie = h.requests[0].cookie ?? ''
    // 关键：`did` 只出现一次，且是用户给的那个。
    // 原先自造的 did 被无条件拼在最前面，同名 cookie 出现两次、服务端取前者，
    // 于是「换 cookie」对 did 完全无效 —— 用户报过这个现象
    expect(cookie.match(/(?:^|;\s*)did=/g)).toHaveLength(1)
    expect(cookie).toContain('did=web_realbrowserdid')
    expect(cookie).not.toMatch(/did=web_[0-9a-f]{32}/)
    expect(cookie.match(/(?:^|;\s*)didv=/g)).toHaveLength(1)
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

/** `visionDanmaku` 的请求变量 */
interface DanmakuVars {
  photoId: string
  positionFromInclude: number
  positionToExclude: number
  pcursor: string
  timestamp: number
}

/** 弹幕专用 adapter：逐窗记录变量，响应由调用方按变量决定 */
const danmakuAdapter = (reply: (vars: DanmakuVars) => unknown): { adapter: AxiosAdapter; windows: DanmakuVars[] } => {
  const windows: DanmakuVars[] = []
  return {
    adapter: async (config) => {
      const body = JSON.parse((config.data ?? '{}') as string) as { variables: DanmakuVars }
      windows.push(body.variables)
      return { data: reply(body.variables), status: 200, statusText: 'OK', headers: {}, config: config as never }
    },
    windows
  }
}

/** 造一个成功的 `visionDanmaku` 响应体 */
const danmakuBody = (rows: Array<{ id: number; body: string; position: number }>): unknown => ({
  data: {
    visionDanmaku: {
      result: 1,
      positionFromInclude: 0,
      positionToExclude: 59999,
      pcursor: 'no_more',
      // 服务端返回的每一条都是 isShow: false —— 那是「还没上屏」，不是「不给看」
      danmakus: rows.map((row) => ({ ...row, userId: '0', isLiked: null, likeCount: null, quality: 2, isShow: false })),
      __typename: 'VisionDanmakuResult'
    }
  }
})

/** 读合并后的弹幕列表 */
const rowsOf = (data: unknown): Array<{ id: number; position: number }> =>
  (data as { data: { visionDanmaku: { danmakus: Array<{ id: number; position: number }> } } }).data.visionDanmaku.danmakus

/**
 * 弹幕的两条硬规则与偶发 `result: 11`。
 *
 * 三条用例正好对应端点声明里三个不常规的槽位：多 spec 的 `build`（窗口切分）、
 * `normalize`（合并去重）、`judge` + `retryOn` + `partial`（13% 抖动）。
 */
describe('kuaishou danmaku：窗口切分、合并去重与 result=11', () => {
  it('步长 60000 / 宽度 59999 连续扫，每个窗口都 < 60000ms；免鉴权不签名', async () => {
    const h = danmakuAdapter(() => danmakuBody([]))
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    // 148633ms 的作品 → to = 149633 → 3 个窗口（与对照项目实测的 3 个请求一致）
    const result = await fetcher.fetchDanmakuList({ photoId: 'p1', duration: 148633 })
    expect(result.success).toBe(true)

    expect(h.windows.map((w) => w.positionFromInclude)).toEqual([0, 60000, 120000])
    // 硬规则 1：宽度 >= 60000 会静默返回空数组，所以一个都不能碰到 60000
    for (const w of h.windows) {
      expect(w.positionToExclude - w.positionFromInclude).toBeLessThan(60000)
    }
    // 前两窗刚好 59999（= 覆盖两个 30 秒桶），末窗按剩余长度收窄到请求终点
    expect(h.windows.map((w) => w.positionToExclude)).toEqual([59999, 119999, 149633])
  })

  it('完全免鉴权：URL 上没有签名产物，Referer 是作品播放页', async () => {
    const requests: Array<{ url: string; headers: Record<string, unknown> }> = []
    const fetcher = createFetcherFromRegistry(
      'kuaishou',
      kuaishouRegistry,
      makeCtx(async (config) => {
        requests.push({ url: config.url ?? '', headers: (config.headers ?? {}) as Record<string, unknown> })
        return { data: danmakuBody([]), status: 200, statusText: 'OK', headers: {}, config: config as never }
      })
    )

    await fetcher.fetchDanmakuList({ photoId: 'p1' })

    expect(requests).toHaveLength(1) // 不给 duration / to 时只取一个最大窗口
    expect(requests[0].url).toBe('https://www.kuaishou.com/graphql')
    expect(requests[0].url).not.toContain('__NS_hxfalcon')
    expect(requests[0].headers.Referer).toBe('https://www.kuaishou.com/short-video/p1')
  })

  it('跨窗口合并去重并按 position 升序（30 秒分桶会让相邻窗口重复给同一条）', async () => {
    const h = danmakuAdapter((vars) =>
      vars.positionFromInclude === 0
        ? danmakuBody([
            { id: 2, body: 'b', position: 20_000 },
            { id: 1, body: 'a', position: 500 }
          ])
        : // 第二窗把 id: 2 又给了一遍（分桶重叠），另加一条更晚的
          danmakuBody([
            { id: 2, body: 'b', position: 20_000 },
            { id: 3, body: 'c', position: 70_000 }
          ])
    )
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchDanmakuList({ photoId: 'p1', to: 90_000 })
    expect(result.success).toBe(true)
    if (!result.success) return

    expect(h.windows).toHaveLength(2)
    expect(rowsOf(result.data).map((row) => row.id)).toEqual([1, 2, 3])
    // 范围写回的是本次**整体**扫描区间，不是最后一窗的值
    const node = (result.data as { data: { visionDanmaku: { positionFromInclude: number; positionToExclude: number } } }).data.visionDanmaku
    expect(node.positionFromInclude).toBe(0)
    expect(node.positionToExclude).toBe(90_000)
  })

  it('result=11 嵌在 data.visionDanmaku 里也判失败：坏窗口重试 4 次后被 tolerate 掉', async () => {
    const h = danmakuAdapter((vars) =>
      vars.positionFromInclude === 0
        ? danmakuBody([{ id: 1, body: 'a', position: 500 }])
        : // 13% 概率的偶发抖动：字段全 null，顶层没有 result
          { data: { visionDanmaku: { result: 11, positionFromInclude: null, positionToExclude: null, pcursor: null, danmakus: null } } }
    )
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchDanmakuList({ photoId: 'p1', to: 90_000 })

    // tolerate：好窗口的弹幕照给
    expect(result.success).toBe(true)
    if (result.success) expect(rowsOf(result.data).map((row) => row.id)).toEqual([1])
    // 好窗口 1 次 + 坏窗口 retryOn 的 4 次
    expect(h.windows).toHaveLength(5)
    expect(h.windows.filter((w) => w.positionFromInclude === 60000)).toHaveLength(4)
  })

  it('全部窗口都回 result=11 时是失败信封，错误码来自平台判定表', async () => {
    const h = danmakuAdapter(() => ({ data: { visionDanmaku: { result: 11, danmakus: null } } }))
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchDanmakuList({ photoId: 'p1' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('PLATFORM_UNAVAILABLE')
      expect(result.error.retryable).toBe(true)
    }
    expect(h.windows).toHaveLength(4)
  })

  it('参数校验：结束位置必须大于起始位置', async () => {
    const h = danmakuAdapter(() => danmakuBody([]))
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx(h.adapter))

    const result = await fetcher.fetchDanmakuList({ photoId: 'p1', from: 1000, to: 500 })
    expect(result.success).toBe(false)
    expect(h.windows).toHaveLength(0)
  })
})

describe('kuaishou registry 结构', () => {
  it('registry 恰好 8 个端点', () => {
    expect(Object.keys(kuaishouRegistry)).toHaveLength(8)
  })

  it('路由：v6 那 6 条逐条一致，另加完整版与弹幕', () => {
    const routes = Object.values(kuaishouRegistry)
      .map((d) => d.route)
      .sort()
    expect(routes).toEqual([
      // 新增：完全免鉴权的 PC GraphQL 弹幕
      '/fetch_danmaku_list',
      '/fetch_emoji_list',
      '/fetch_live_room_info',
      // 主通道，走免签的 ugH5App/photo/simple/info（快手分享页 SSR 用的就是它）
      '/fetch_one_work',
      // 完整版 photo/info：签名 + 14 键 body，当前稳定撞 2001 风控
      '/fetch_one_work_full',
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

/**
 * 撞验证码时失败信封要带 `error.challenge`。
 *
 * 这一层原先是断的：judge 把 `2001` 判成 `risk` / `CAPTCHA_REQUIRED`，但滑块地址
 * 只能从 `error.raw` 里自己捞，而 `raw` 只有 `createClient({ debug: true })` 才有、
 * HTTP 路由那一面**结构上拿不到**（`createKuaishouRoutes` 不接 `debug`）——
 * 最需要地址的入口恰好是唯一产不出它的入口。
 */
describe('kuaishou 风控挑战透出', () => {
  const captchaBody = {
    result: 2001,
    error_msg: '[2001] antispam need captcha',
    captchaConfig: JSON.stringify({
      type: 1,
      url: 'https://captcha.zt.kuaishou.com/rest/zt/captcha/sliding/config?captchaSession=SESSION1&bizName=DEFAULT',
      jsSdkUrl: '//ali2.a.yximgs.com/static/captcha/sdk/kwaiCaptcha.umd.min.js'
    })
  }

  it('videoWorkFull 撞 2001：error.challenge 带出滑块地址与票据，且不依赖 debug', async () => {
    const h = routingAdapter({ '/rest/wd/photo/info': captchaBody })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, {
      ...makeCtx(h.adapter),
      judge: kuaishouJudge,
      challenge: parseKuaishouCaptcha
      // 刻意不设 debug —— 这一份的全部意义就是「不受排障开关管」
    })

    const result = await fetcher.fetchVideoWorkFull({ photoId: 'p1' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.kind).toBe('risk')
    expect(result.error.code).toBe('CAPTCHA_REQUIRED')
    expect(result.error.challenge?.url).toContain('captcha.zt.kuaishou.com')
    expect(result.error.challenge?.session).toBe('SESSION1')
    expect(result.error.challenge?.result).toBe(2001)
    // debug 没开，所以原始响应体仍然不带出 —— 两者是独立的开关
    expect(result.error.raw).toBeUndefined()
  })

  it('普通业务失败不凭空多一个 challenge 键', async () => {
    const h = routingAdapter({ '/rest/wd/photo/info': { result: 2, error_msg: null } })
    const fetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, {
      ...makeCtx(h.adapter),
      judge: kuaishouJudge,
      challenge: parseKuaishouCaptcha
    })

    const result = await fetcher.fetchVideoWorkFull({ photoId: 'p1' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.kind).toBe('rate_limit')
    expect('challenge' in result.error).toBe(false)
  })
})
