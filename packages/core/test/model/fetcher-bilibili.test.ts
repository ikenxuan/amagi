import { bilibiliFetcher } from 'amagi/model/fetchers'
/**
 * B站 fetcher 端到端调用链。
 *
 * 注意：`comments` / `userDynamicList` / `userSpaceInfo` / `videoStream` / `bangumiStream`
 * 会走 wbi 签名，而 `sign/wbi.ts` 直接调用 axios（绕过 fetchData，无法通过
 * requestConfig 注入 adapter），因此这些接口不在端到端用例里覆盖，
 * 只在 sign / 架构泄漏用例中单独断言。
 */
import { describe, expect, it } from 'vitest'

import { constantAdapter } from '../helpers/adapter'
import { bilibiliOk, BVID } from '../helpers/fixtures'

const COOKIE = 'SESSDATA=abc; bili_jct=def'

describe('bilibili fetchVideoInfo', () => {
  it('返回成功 Result', async () => {
    const h = constantAdapter(bilibiliOk({ bvid: BVID, title: 'demo' }))
    const result = await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(result.code).toBe(200)
    expect(result.data.data.title).toBe('demo')
  })

  it('命中 view 接口并带上 bvid', async () => {
    const h = constantAdapter(bilibiliOk({}))
    await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(h.last().url).toContain('api.bilibili.com/x/web-interface/view')
    expect(h.last().query.bvid).toBe(BVID)
  })

  it('cookie 写入大写 Cookie 头', async () => {
    const h = constantAdapter(bilibiliOk({}))
    await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(h.last().headers.Cookie).toBe(COOKIE)
    expect(h.last().headers.cookie).toBeUndefined()
  })

  it('默认 Referer 指向 bilibili.com', async () => {
    const h = constantAdapter(bilibiliOk({}))
    await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(h.last().headers.Referer).toBe('https://www.bilibili.com/')
  })

  it('code 非 0 时返回失败 Result，并把 B站 code 作为 Result.code', async () => {
    const h = constantAdapter({ code: -404, message: '啥都木有' })
    const result = await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    expect(result.code).toBe(-404)
  })

  // GlobalGetData 把平台响应重新包成 { code, data, amagiError }，
  // 原始的 message 被埋进 data 里，internal.ts 读 rawData.message 只会拿到 undefined。
  it('KNOWN-DEFECT: 平台返回的 message 丢失，只剩兜底文案', async () => {
    const h = constantAdapter({ code: -404, message: '啥都木有' })
    const result = await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(result.message).toBe('B站数据获取失败')
    // 原始文案只能从 error.errorDescription 里挖出来
    expect((result.error as unknown as { errorDescription: string }).errorDescription).toContain('啥都木有')
  })

  // Result.code 被直接喂给 res.status()，负数会让 Express 抛错。
  it('KNOWN-DEFECT: 失败时 Result.code 是平台业务码而非 HTTP 状态码', async () => {
    const h = constantAdapter({ code: -352, message: '风控校验失败' })
    const result = await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(result.code).toBe(-352)
    expect(result.code).toBeLessThan(0)
  })

  it('code 非 0 且无 message 时使用兜底文案', async () => {
    const h = constantAdapter({ code: -400 })
    const result = await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(result.message).toBe('B站数据获取失败')
    expect(result.error).toMatchObject({ requestType: 'videoInfo' })
  })

  it('参数校验失败时抛错', async () => {
    const h = constantAdapter(bilibiliOk({}))
    await expect(bilibiliFetcher.fetchVideoInfo({ bvid: '' }, COOKIE, { adapter: h.adapter })).rejects.toThrow(/B站数据获取失败/)
    expect(h.count).toBe(0)
  })
})

describe('bilibili 无参与简单接口', () => {
  it('fetchEmojiList 命中表情面板接口', async () => {
    const h = constantAdapter(bilibiliOk({ packages: [] }))
    const result = await bilibiliFetcher.fetchEmojiList(undefined, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(h.last().url).toContain('/x/emote/user/panel/web')
  })

  it('fetchLoginStatus 命中 nav 接口', async () => {
    const h = constantAdapter(bilibiliOk({ isLogin: true }))
    const result = await bilibiliFetcher.fetchLoginStatus(undefined, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(h.last().url).toContain('/x/web-interface/nav')
  })

  it('fetchUserCard 命中 card 接口并带 mid', async () => {
    const h = constantAdapter(bilibiliOk({ card: {} }))
    await bilibiliFetcher.fetchUserCard({ host_mid: 123 }, COOKIE, { adapter: h.adapter })

    expect(h.last().url).toContain('/x/web-interface/card')
    expect(h.last().query.mid).toBe('123')
  })
})

describe('bilibili av / bv 纯计算接口', () => {
  it('convertAvToBv 不发起任何 HTTP 请求', async () => {
    const h = constantAdapter(bilibiliOk({}))
    const result = await bilibiliFetcher.convertAvToBv({ avid: 170001 }, COOKIE, { adapter: h.adapter })

    expect(h.count).toBe(0)
    expect(result.success).toBe(true)
  })

  it('convertBvToAv 不发起任何 HTTP 请求', async () => {
    const h = constantAdapter(bilibiliOk({}))
    const result = await bilibiliFetcher.convertBvToAv({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(h.count).toBe(0)
    expect(result.success).toBe(true)
  })

  it('av -> bv -> av 往返一致（注意 aid 带 av 前缀且为字符串）', async () => {
    const toBv = await bilibiliFetcher.convertAvToBv({ avid: 170001 }, COOKIE)
    const bvid = (toBv.data as { data: { bvid: string } }).data.bvid
    const toAv = await bilibiliFetcher.convertBvToAv({ bvid }, COOKIE)

    expect((toAv.data as { data: { aid: string } }).data.aid).toBe('av170001')
  })

  it('convertAvToBv 的返回形状被锁定', async () => {
    const result = await bilibiliFetcher.convertAvToBv({ avid: 170001 }, COOKIE)
    expect(result.data).toEqual({ code: 0, message: 'success', data: { bvid: 'BV17x411w7KC' } })
  })

  it('convertBvToAv 的返回形状被锁定', async () => {
    const result = await bilibiliFetcher.convertBvToAv({ bvid: 'BV17x411w7KC' }, COOKIE)
    expect(result.data).toEqual({ code: 0, message: 'success', data: { aid: 'av170001' } })
  })
})

describe('bilibili GlobalGetData 的响应判定边界', () => {
  // getdata 层认定这是错误并抛出，但抛出的对象带着 code: 0；
  // internal.ts 的判定是 rawData.code !== 0，于是又把它当成成功。
  // 结果：success: true，而 data 里装的是错误信封。
  it('KNOWN-DEFECT: data 为空对象时 getdata 判错、internal 判成功，最终返回错误信封', async () => {
    const h = constantAdapter({ code: 0, message: '0', data: {} })
    const result = await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('amagiError')
    expect((result.data as unknown as { amagiError: { errorDescription: string } }).amagiError.errorDescription).toContain(
      '请求成功但无返回内容'
    )
  })

  // data 为 null 时走的是另一条路：isEmptyObjectPayload 里的 Object.keys(null)
  // 会抛 TypeError，被 GlobalGetData 的 catch 兜住，返回的对象没有 code 字段，
  // 于是 internal.ts 的 rawData.code !== 0 判定成立 -> success: false。
  // 同一类「无有效负载」在 data: {} 与 data: null 两种写法下结论相反。
  it('KNOWN-DEFECT: data 为 null 与 data 为 {} 的结论相反', async () => {
    const nullPayload = await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, {
      adapter: constantAdapter({ code: 0, message: '0', data: null }).adapter
    })
    const emptyPayload = await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, {
      adapter: constantAdapter({ code: 0, message: '0', data: {} }).adapter
    })

    expect(nullPayload.success).toBe(false)
    expect(emptyPayload.success).toBe(true)
  })

  it('data 为空数组时判为成功（数组不走空对象分支）', async () => {
    const h = constantAdapter({ code: 0, message: '0', data: [] })
    const result = await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
  })

  it('用 result 字段承载 payload 时也认', async () => {
    const h = constantAdapter({ code: 0, result: { title: 'x' } })
    const result = await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
  })

  it('code 为 -412 时在 GlobalGetData 内部额外重试 3 次（共 4 次请求）', async () => {
    const h = constantAdapter({ code: -412, message: '请求被拦截' })
    await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(h.count).toBe(4)
  })

  it('非 -412 的错误码不额外重试', async () => {
    const h = constantAdapter({ code: -404, message: '啥都木有' })
    await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(h.count).toBe(1)
  })
})
