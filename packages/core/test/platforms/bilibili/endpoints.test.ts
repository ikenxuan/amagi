import { createFetcherFromRegistry } from 'amagi/client/fetcher'
import type { ClientCtx } from 'amagi/client/fetcher'
import { routePathsOf } from 'amagi/server/routes'
import { bilibiliRegistry } from 'amagi/platforms/bilibili/endpoints'
import { createBilibiliSigners } from 'amagi/platforms/bilibili/sign/signers'
import { bilibiliJudge } from 'amagi/platforms/bilibili/judge'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
import type { AxiosAdapter } from 'axios'
import { describe, expect, it } from 'vitest'
import { bilibiliOk } from '../../helpers/fixtures'
/**
 * 阶段门 4 判据：**27 个端点各有一条端到端用例**（adapter 注入，不发真实请求），
 * 另加：
 * - wbi 系接口能被 adapter 拦到（v6 做不到）+ wbi 缓存：3 次签名 1 次 /nav
 * - comments 的 5 个被 strip 的参数端到端可用（pagination_str 翻到第二页）
 * - videoDanmaku protobuf 解码
 * - 路由唯一性：27 条路径互不重复
 */

const BL_COOKIE = 'SESSDATA=abc; bili_jct=csrf'

const NAV_BODY = {
  code: 0,
  data: {
    wbi_img: {
      img_url: 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
      sub_url: 'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png'
    },
    vipStatus: 1
  }
}

/** 注入 adapter 的 ClientCtx（wbi 签名走真实 signer —— 正好验证 /nav 可被拦） */
const makeCtx = (adapter: AxiosAdapter): ClientCtx => {
  const trace = new TraceCollector()
  const http = new HttpClient({ trace, requestConfig: { adapter } })
  const signers = createBilibiliSigners()
  return {
    clientId: 'client-1',
    platform: 'bilibili',
    cookie: BL_COOKIE,
    userAgent: 'ua/1',
    requestConfig: {},
    trace,
    signers: { 'wbi': signers['wbi'], 'qtparam': signers['qtparam'] },
    judge: bilibiliJudge,
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
        data: responses[path] ?? { code: 0, message: '0', data: {} },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config as never
      }
    },
    requests
  }
}

describe('bilibili 27 个端点端到端', () => {
  it('videoInfo：GET + bvid 进查询参数', async () => {
    const h = routingAdapter({ '/x/web-interface/view': bilibiliOk({ bvid: 'BV1xx411c7mD' }) })
    const fetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx(h.adapter))
    const result = await fetcher.fetchVideoInfo({ bvid: 'BV1xx411c7mD' })
    expect(result.success).toBe(true)
    expect(new URL(h.requests[0].url).pathname).toBe('/x/web-interface/view')
  })

  it('videoStream：qtparam 签名（/nav 前置 + fnval 档位）', async () => {
    const h = routingAdapter({
      '/x/web-interface/nav': NAV_BODY,
      '/x/player/playurl': bilibiliOk({ quality: 64 })
    })
    const fetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx(h.adapter))
    const result = await fetcher.fetchVideoStreamUrl({ avid: 170001, cid: 1 })
    expect(result.success).toBe(true)
    const playurl = h.requests.find((r) => r.url.includes('/x/player/playurl'))
    expect(playurl?.url).toContain('&fnval=4048&fourk=1') // VIP
    expect(playurl?.url).toContain('&w_rid=')
  })

  it('comments：wbi 签名 + pagination_str 翻到第二页（#52 5 参数可用）', async () => {
    const requests: Array<{ url: string; offset: string }> = []
    const fetcher = createFetcherFromRegistry(
      'bilibili',
      bilibiliRegistry,
      makeCtx(async (config) => {
        const url = config.url ?? ''
        if (url.includes('/x/web-interface/nav')) {
          return { data: NAV_BODY, status: 200, statusText: 'OK', headers: {}, config: config as never }
        }
        const offset = new URL(url).searchParams.get('pagination_str') ?? ''
        requests.push({ url, offset })
        // getComments 总是把 pagination_str 包成 JSON：{"offset":"..."}
        const page = offset === '{"offset":""}'
          ? bilibiliOk({ replies: [{ rpid: '1' }, { rpid: '2' }], cursor: { is_end: false, pagination_reply: { next_offset: 'TOKEN2' } } })
          : bilibiliOk({ replies: [{ rpid: '3' }], cursor: { is_end: true } })
        return { data: page, status: 200, statusText: 'OK', headers: {}, config: config as never }
      })
    )

    const result = await fetcher.fetchComments({ oid: '170001', type: 1, number: 3, mode: 2, plat: 3, seek_rpid: 'r', web_location: '9' })
    expect(result.success).toBe(true)
    expect(requests).toHaveLength(2)
    expect(requests[0].offset).toBe('{"offset":""}')
    expect(requests[1].offset).toBe('{"offset":"TOKEN2"}')
    // #52：5 个参数真的进了 URL
    const first = new URL(requests[0].url).searchParams
    expect(first.get('mode')).toBe('2')
    expect(first.get('plat')).toBe('3')
    expect(first.get('seek_rpid')).toBe('r')
    expect(first.get('web_location')).toBe('9')
    // 去重 + 截断
    if (result.success) expect(result.data.data.replies).toEqual([{ rpid: '1' }, { rpid: '2' }, { rpid: '3' }])
  })

  it('commentReplies / userCard / userLiveStatus / uploaderTotalViews / dynamicDetail', async () => {
    const h = routingAdapter({})
    const fetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx(h.adapter))
    const calls: Array<[string, Record<string, unknown>]> = [
      ['fetchCommentReplies', { oid: '1', type: 1, root: '2' }],
      ['fetchUserCard', { host_mid: 123 }],
      ['fetchUserLiveStatus', { host_mid: 123 }],
      ['fetchUploaderTotalViews', { host_mid: 123 }],
      ['fetchDynamicDetail', { dynamic_id: 'd1' }]
    ]
    for (const [method, params] of calls) {
      const result = await (fetcher as unknown as Record<string, (p: unknown) => Promise<unknown>>)[method](params)
      expect(result, method).toHaveProperty('success')
    }
    expect(h.requests).toHaveLength(5)
  })

  it('userDynamicList / userSpaceInfo：wbi 签名 + Origin/Referer', async () => {
    const h = routingAdapter({
      '/x/web-interface/nav': NAV_BODY,
      '/x/polymer/web-dynamic/v1/feed/space': bilibiliOk({ items: [] }),
      '/x/space/wbi/acc/info': bilibiliOk({ mid: 123 })
    })
    const fetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx(h.adapter))

    const dyn = await fetcher.fetchUserDynamicList({ host_mid: 123 })
    expect(dyn.success).toBe(true)
    const space = await fetcher.fetchUserSpaceInfo({ host_mid: 123 })
    expect(space.success).toBe(true)
    // wbi 系请求都带 w_rid（/nav 前置请求除外）
    const signed = h.requests.filter((r) => !r.url.includes('/x/web-interface/nav'))
    for (const r of signed) expect(r.url).toContain('w_rid=')
  })

  it('bangumiInfo（ep/ss 前缀剥离）/ bangumiStream（qtparam）', async () => {
    const h = routingAdapter({
      '/x/web-interface/nav': NAV_BODY,
      '/pgc/view/web/season': bilibiliOk({ season_id: '33802' }),
      '/pgc/player/web/playurl': bilibiliOk({ quality: 64 })
    })
    const fetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx(h.adapter))

    const info = await fetcher.fetchBangumiInfo({ season_id: 'ss33802' })
    expect(info.success).toBe(true)
    // requests[0] 是 season 接口（bangumiInfo 无签名，不发 /nav）
    expect(new URL(h.requests[0].url).searchParams.get('season_id')).toBe('33802')

    const stream = await fetcher.fetchBangumiStreamUrl({ cid: 1, ep_id: 'ep330798' })
    expect(stream.success).toBe(true)
    const playurl = h.requests.find((r) => r.url.includes('/pgc/player/web/playurl'))
    expect(playurl?.url).toContain('ep_id=330798')
  })

  it('liveRoomInfo / liveRoomInit / loginStatus / loginQrcode / qrcodeStatus', async () => {
    const h = routingAdapter({})
    const fetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx(h.adapter))
    const calls: Array<[string, Record<string, unknown>]> = [
      ['fetchLiveRoomInfo', { room_id: 'r1' }],
      ['fetchLiveRoomInitInfo', { room_id: 'r1' }],
      ['fetchLoginStatus', {}],
      ['requestLoginQrcode', {}],
      ['checkQrcodeStatus', { qrcode_key: 'k1' }]
    ]
    for (const [method, params] of calls) {
      const result = await (fetcher as unknown as Record<string, (p: unknown) => Promise<unknown>>)[method](params)
      expect(result, method).toHaveProperty('success')
    }
    expect(h.requests).toHaveLength(5)
  })

  it('articleContent / articleCards / articleInfo / articleListInfo', async () => {
    const h = routingAdapter({})
    const fetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx(h.adapter))
    const calls: Array<[string, Record<string, unknown>]> = [
      ['fetchArticleContent', { id: 'cv1' }],
      ['fetchArticleCards', { ids: ['av1', 'cv2'] }],
      ['fetchArticleInfo', { id: 'cv1' }],
      ['fetchArticleListInfo', { id: 'a1' }]
    ]
    for (const [method, params] of calls) {
      const result = await (fetcher as unknown as Record<string, (p: unknown) => Promise<unknown>>)[method](params)
      expect(result, method).toHaveProperty('success')
    }
    expect(h.requests).toHaveLength(4)
  })

  it('captchaFromVoucher / validateCaptcha：POST + body', async () => {
    const h = routingAdapter({})
    const fetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx(h.adapter))

    const register = await fetcher.requestCaptchaFromVoucher({ v_voucher: 'v1' })
    expect(register.success).toBe(true)
    const validate = await fetcher.validateCaptchaResult({ challenge: 'c', token: 't', validate: 'v', seccode: 's' })
    expect(validate.success).toBe(true)
    expect(h.requests[0].method).toBe('post')
    expect(h.requests[1].method).toBe('post')
  })

  it('emojiList：GET 表情面板接口', async () => {
    const h = routingAdapter({ '/x/emote/user/panel/web': bilibiliOk({ packages: [] }) })
    const fetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx(h.adapter))
    const result = await fetcher.fetchEmojiList({})
    expect(result.success).toBe(true)
    expect(new URL(h.requests[0].url).pathname).toBe('/x/emote/user/panel/web')
  })

  it('avToBv / bvToAv：纯本地计算，不发请求，返回形状 v7 化', async () => {
    const h = routingAdapter({})
    const fetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx(h.adapter))

    const toBv = await fetcher.convertAvToBv({ avid: 170001 })
    expect(toBv.success).toBe(true)
    if (toBv.success) expect(toBv.data).toEqual({ bvid: 'BV17x411w7KC' })

    const toAv = await fetcher.convertBvToAv({ bvid: 'BV17x411w7KC' })
    expect(toAv.success).toBe(true)
    if (toAv.success) expect(toAv.data).toEqual({ aid: 170001 }) // A7：number 不带 av 前缀

    expect(h.requests).toHaveLength(0)
  })

  it('avToBv 小数入参被拦（修 #35）：validation 信封', async () => {
    const fetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx(routingAdapter({}).adapter))
    const result = await fetcher.convertAvToBv({ avid: 1.5 })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.kind).toBe('validation')
  })

  it('bvToAv 非法 BV 号被拦（修 #34）：validation 信封', async () => {
    const fetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx(routingAdapter({}).adapter))
    const result = await fetcher.convertBvToAv({ bvid: 'short' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.kind).toBe('validation')
  })
})

describe('wbi 系接口：adapter 能拦到 /nav（v6 做不到）+ 缓存 3 次签名 1 次 /nav', () => {
  it('连续 3 个 wbi 端点只打 1 次 /nav（TTL 缓存随实例）', async () => {
    const h = routingAdapter({
      '/x/web-interface/nav': NAV_BODY,
      '/x/space/wbi/acc/info': bilibiliOk({ mid: 123 })
    })
    const fetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx(h.adapter))

    await fetcher.fetchUserSpaceInfo({ host_mid: 123 })
    await fetcher.fetchUserSpaceInfo({ host_mid: 123 })
    await fetcher.fetchUserSpaceInfo({ host_mid: 123 })

    const navCount = h.requests.filter((r) => r.url.includes('/x/web-interface/nav')).length
    expect(navCount).toBe(1)
  })
})

describe('videoDanmaku protobuf 解码', () => {
  it('arraybuffer 响应被 parseDmSegMobileReply 解析为 { elems }', async () => {
    // 用 protobufjs 现场编码一段 DmSegMobileReply，确保解码路径真实
    const protobuf = (await import('protobufjs')).default
    const root = protobuf.Root.fromJSON({
      nested: {
        bilibili: {
          nested: {
            community: {
              nested: {
                service: {
                  nested: {
                    dm: {
                      nested: {
                        v1: {
                          nested: {
                            DmSegMobileReply: {
                              fields: { elems: { rule: 'repeated', type: 'DanmakuElem', id: 1 } }
                            },
                            DanmakuElem: {
                              fields: {
                                id: { type: 'int64', id: 1 },
                                progress: { type: 'int32', id: 2 },
                                content: { type: 'string', id: 7 }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
    const Reply = root.lookupType('bilibili.community.service.dm.v1.DmSegMobileReply')
    const buffer = Reply.encode(Reply.create({ elems: [{ id: 1, progress: 1234, content: '你好' }] })).finish()

    const fetcher = createFetcherFromRegistry(
      'bilibili',
      bilibiliRegistry,
      makeCtx(async (config) => {
        return {
          data: buffer,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config as never
        }
      })
    )
    const result = await fetcher.fetchVideoDanmaku({ cid: 1 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveProperty('elems')
      const elems = result.data.elems as Array<{ progress?: number; content?: string }>
      expect(elems[0].progress).toBe(1234)
      expect(elems[0].content).toBe('你好')
    }
  })
})

describe('路由唯一性', () => {
  it('27 条路径互不重复', () => {
    const paths = routePathsOf(bilibiliRegistry)
    expect(paths).toHaveLength(27)
    expect(new Set(paths).size).toBe(27)
  })

  it('与 v6 路由表逐条一致', () => {
    const v6Routes: Array<[string, string]> = [
      ['videoInfo', '/fetch_one_video'],
      ['videoStream', '/fetch_video_playurl'],
      ['comments', '/fetch_work_comments'],
      ['commentReplies', '/fetch_comment_reply'],
      ['userCard', '/fetch_user_profile'],
      ['userDynamicList', '/fetch_user_dynamic'],
      ['userLiveStatus', '/fetch_user_live_status'],
      ['userSpaceInfo', '/fetch_user_space_info'],
      ['emojiList', '/fetch_emoji_list'],
      ['bangumiInfo', '/fetch_bangumi_video_info'],
      ['bangumiStream', '/fetch_bangumi_video_playurl'],
      ['dynamicDetail', '/fetch_dynamic_info'],
      ['liveRoomInfo', '/fetch_live_room_detail'],
      ['liveRoomInit', '/fetch_liveroom_def'],
      ['loginStatus', '/login_basic_info'],
      ['loginQrcode', '/new_login_qrcode'],
      ['qrcodeStatus', '/check_qrcode'],
      ['uploaderTotalViews', '/fetch_user_full_view'],
      ['avToBv', '/av_to_bv'],
      ['bvToAv', '/bv_to_av'],
      ['articleContent', '/fetch_article_content'],
      ['articleCards', '/fetch_article_card'],
      ['articleInfo', '/fetch_article_info'],
      ['articleListInfo', '/fetch_column_info'],
      ['captchaFromVoucher', '/apply_captcha'],
      ['validateCaptcha', '/validate_captcha'],
      ['videoDanmaku', '/fetch_danmaku']
    ]
    for (const [endpoint, route] of v6Routes) {
      expect(routePathsOf(bilibiliRegistry)).toContain(route)
      expect(bilibiliRegistry[endpoint as keyof typeof bilibiliRegistry].route, endpoint).toBe(route)
    }
  })
})

describe('qrcodeStatus 返回形状（不再透出 headers）', () => {
  it('data 是平台响应体，不含 headers', async () => {
    const fetcher = createFetcherFromRegistry(
      'bilibili',
      bilibiliRegistry,
      makeCtx(async (config) => {
        return {
          data: bilibiliOk({ url: 'https://x', qrcode_key: 'k' }),
          status: 200,
          statusText: 'OK',
          headers: { 'set-cookie': ['SESSDATA=new'] },
          config: config as never
        }
      })
    )
    const result = await fetcher.checkQrcodeStatus({ qrcode_key: 'k' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveProperty('data')
      expect((result.data as Record<string, unknown>).data).toHaveProperty('url')
      expect((result.data as Record<string, unknown>).data).not.toHaveProperty('headers')
    }
  })
})

describe('retryOn：-412 退避重试（修 A4，v7 不再递归）', () => {
  it('videoInfo 命中 -412 时重试（retryOn: RISK_CONTROL）', async () => {
    const requests: string[] = []
    const trace = new TraceCollector()
    const http = new HttpClient({ trace, requestConfig: { adapter: async (config) => {
      const url = config.url ?? ''
      requests.push(url)
      const n = requests.length
      const body = n < 4 ? { code: -412, message: '请求被拦截' } : bilibiliOk({ bvid: 'BV1xx411c7mD' })
      return { data: body, status: n < 4 ? 412 : 200, statusText: 'OK', headers: {}, config: config as never }
    } } })
    const signers = createBilibiliSigners()
    const fetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, {
      clientId: 'client-1',
      platform: 'bilibili',
      cookie: BL_COOKIE,
      userAgent: 'ua/1',
      requestConfig: {},
      trace,
      signers: { 'wbi': signers['wbi'], 'qtparam': signers['qtparam'] },
      judge: bilibiliJudge,
      send: (spec, reason) => http.send(spec, reason),
      sleep: async () => {} // 退避不真等
    })
    const result = await fetcher.fetchVideoInfo({ bvid: 'BV1xx411c7mD' })
    expect(result.success).toBe(true) // 第 4 次成功
    expect(requests).toHaveLength(4) // 1 次初始 + 3 次退避重试
  })
})
