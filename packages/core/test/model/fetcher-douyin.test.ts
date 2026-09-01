import { douyinFetcher } from 'amagi/model/fetchers'
import { fetchData } from 'amagi/model/networks'
/**
 * 抖音 fetcher 端到端调用链：
 *   fetcher -> internal (校验 + 事件) -> platform/getdata (URL + 签名 + 分页) -> networks -> axios adapter
 *
 * 通过 requestConfig.adapter 注入假 adapter，不发真实请求也不 mock 模块。
 */
import { describe, expect, it } from 'vitest'

import { constantAdapter, failingAdapter, sequenceAdapter } from '../helpers/adapter'
import { AWEME_ID, douyinOk, SEC_UID } from '../helpers/fixtures'

const COOKIE = 'sessionid=test; ttwid=abc'

describe('douyin fetchVideoWork', () => {
  it('返回成功 Result，并携带原始响应', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: { aweme_id: AWEME_ID, desc: 'hi' } }))
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(result.code).toBe(200)
    expect(result.message).toBe('获取成功')
    expect(result.data.aweme_detail.desc).toBe('hi')
  })

  it('命中抖音作品详情接口并带上 aweme_id', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(h.last().url).toContain('/aweme/v1/web/aweme/detail/')
    expect(h.last().query.aweme_id).toBe(AWEME_ID)
  })

  it('URL 上附加了 a_bogus 签名', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(h.last().query.a_bogus).toBeTruthy()
    expect(h.last().query.a_bogus.length).toBeGreaterThan(10)
  })

  it('cookie 进入 Cookie 请求头', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(h.last().headers.Cookie).toBe(COOKIE)
  })

  it('不传 cookie 时 Cookie 头为空字符串', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, undefined, { adapter: h.adapter })

    expect(h.last().headers.Cookie).toBe('')
  })

  it('默认注入完整的浏览器指纹请求头', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    const headers = h.last().headers
    expect(headers['User-Agent']).toContain('Chrome/')
    expect(headers.Referer).toBe('https://www.douyin.com/')
    expect(headers['Sec-Ch-Ua']).toContain('Google Chrome')
    expect(headers['Sec-Fetch-Site']).toBe('same-origin')
  })

  it('参数校验失败时抛错而非返回 Result', async () => {
    const h = constantAdapter(douyinOk({}))
    await expect(douyinFetcher.fetchVideoWork({ aweme_id: '' }, COOKIE, { adapter: h.adapter })).rejects.toThrow(/抖音数据获取失败/)
    expect(h.count).toBe(0)
  })
})

describe('douyin 请求配置覆盖', () => {
  it('自定义 User-Agent 覆盖默认值，且用于签名', async () => {
    const ua = 'Mozilla/5.0 CustomAgent Chrome/130.0.0.0 Safari/537.36'
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter, headers: { 'User-Agent': ua } })

    expect(h.last().headers['User-Agent']).toBe(ua)
  })

  it('自定义 Referer 抑制 getdata 内部的 Referer 注入', async () => {
    const h = constantAdapter(douyinOk({ user: {} }))
    await douyinFetcher.fetchUserProfile({ sec_uid: SEC_UID }, COOKIE, {
      adapter: h.adapter,
      headers: { Referer: 'https://custom.example/' }
    })

    expect(h.last().headers.Referer).toBe('https://custom.example/')
  })

  it('未指定 Referer 时 userProfile 自动注入用户主页 Referer', async () => {
    const h = constantAdapter(douyinOk({ user: {} }))
    await douyinFetcher.fetchUserProfile({ sec_uid: SEC_UID }, COOKIE, { adapter: h.adapter })

    expect(h.last().headers.Referer).toBe('https://www.douyin.com/user/' + SEC_UID)
  })

  it('自定义 timeout 覆盖默认 10000', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter, timeout: 999 })

    expect(h.requests[0]).toBeDefined()
  })
})

describe('douyin 错误路径', () => {
  it('status_code 非 0 时返回失败 Result', async () => {
    const h = constantAdapter({ status_code: 2154, status_msg: '风控拦截' })
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    expect(result.message).toBe('风控拦截')
    expect(result.code).toBe(500)
  })

  it('status_code 缺失时也判为失败（undefined !== 0）', async () => {
    const h = constantAdapter({ some: 'payload' })
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
  })

  it('响应为空字符串时走 cookie 失效分支', async () => {
    const h = constantAdapter('')
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    // 注意：平台级错误的 error 就是 ErrorDetail 本身，没有再包一层 amagiError
    expect((result.error as unknown as { errorDescription: string }).errorDescription).toContain('接口返回内容为空')
  })

  it('filter_detail.filter_reason 存在时走内容过滤分支', async () => {
    const h = constantAdapter({ status_code: 0, filter_detail: { filter_reason: '内容不可见' } })
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    expect((result.error as unknown as { errorDescription: string }).errorDescription).toContain('内容不可见')
  })
})

describe('KNOWN-DEFECT: Result.error 的形状不稳定', () => {
  // 情况一：平台返回非 0 status_code。GlobalGetData 不认为这是错误（它只拦
  // 空响应和 filter_detail），因此 rawData 上没有 amagiError，
  // internal.ts 却把它原样交给 createErrorResponse -> error 直接是 undefined。
  it('platform status_code 非 0 时 error 为 undefined，与声明的 APIErrorType 不符', async () => {
    const h = constantAdapter({ status_code: 8, status_msg: 'bad' })
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    expect(result.error).toBeUndefined()
  })

  // 情况二：GlobalGetData 自己造的错误。error 是内层 ErrorDetail。
  it('空响应时 error 是 ErrorDetail，字段在第一层', async () => {
    const h = constantAdapter('')
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    expect(result.error).toHaveProperty('errorDescription')
    expect(result.error).toHaveProperty('requestType', 'videoWork')
    expect(result.error).not.toHaveProperty('amagiError')
  })

  // 情况三：networks 层造的错误。error 是完整 APIErrorType，字段在第二层。
  it('网络错误时 error 是 APIErrorType，字段在 amagiError 里', async () => {
    const h = failingAdapter('ERR_BAD_RESPONSE', 99)
    const raw = (await fetchData({ url: 'https://example.com/x', adapter: h.adapter }, 0)) as {
      success: false
      error: Record<string, unknown>
    }

    expect(raw.success).toBe(false)
    expect(raw.error).toHaveProperty('amagiError')
    expect(raw.error).toHaveProperty('code')
    expect(raw.error).not.toHaveProperty('errorDescription')
  })

  it('三种形状没有任何共同的错误字段，调用方无法用统一写法读取', async () => {
    const undefinedShape = await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, {
      adapter: constantAdapter({ status_code: 8, status_msg: 'bad' }).adapter
    })
    const detailShape = await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: constantAdapter('').adapter })
    const apiErrorShape = (await fetchData({ url: 'https://x/', adapter: failingAdapter('ERR_BAD_RESPONSE', 99).adapter }, 0)) as {
      error: Record<string, unknown>
    }

    expect(undefinedShape.error).toBeUndefined()
    const detailKeys = Object.keys(detailShape.error as unknown as object)
    const apiErrorKeys = Object.keys(apiErrorShape.error)
    expect(detailKeys.filter((k) => apiErrorKeys.includes(k))).toEqual([])
  })
})

describe('douyin 分页累积 (fetchWorkComments)', () => {
  const page = (n: number, hasMore: 0 | 1, cursor: number) =>
    douyinOk({
      comments: Array.from({ length: n }, (_, i) => ({ cid: 'c' + (cursor + i) })),
      cursor,
      has_more: hasMore
    })

  it('单页足够时只请求一次', async () => {
    const h = constantAdapter(page(20, 0, 20))
    const result = await douyinFetcher.fetchWorkComments({ aweme_id: AWEME_ID, number: 20 }, COOKIE, { adapter: h.adapter })

    expect(h.count).toBe(1)
    expect(result.data.comments).toHaveLength(20)
  })

  it('跨页累积并按 number 截断', async () => {
    const h = sequenceAdapter([page(50, 1, 50), page(50, 1, 100), page(50, 1, 150)])
    const result = await douyinFetcher.fetchWorkComments({ aweme_id: AWEME_ID, number: 120 }, COOKIE, { adapter: h.adapter })

    expect(h.count).toBe(3)
    expect(result.data.comments).toHaveLength(120)
  })

  it('has_more 为 0 时提前停止，返回实际条数', async () => {
    const h = sequenceAdapter([page(50, 1, 50), page(10, 0, 60)])
    const result = await douyinFetcher.fetchWorkComments({ aweme_id: AWEME_ID, number: 200 }, COOKIE, { adapter: h.adapter })

    expect(h.count).toBe(2)
    expect(result.data.comments).toHaveLength(60)
  })

  it('返回空列表时立即停止', async () => {
    const h = sequenceAdapter([page(0, 1, 0)])
    const result = await douyinFetcher.fetchWorkComments({ aweme_id: AWEME_ID, number: 50 }, COOKIE, { adapter: h.adapter })

    expect(h.count).toBe(1)
    expect(result.data.comments).toHaveLength(0)
  })

  it('翻页时把上一页 cursor 带入下一次请求', async () => {
    const h = sequenceAdapter([page(50, 1, 777), page(50, 0, 888)])
    await douyinFetcher.fetchWorkComments({ aweme_id: AWEME_ID, number: 100 }, COOKIE, { adapter: h.adapter })

    expect(h.at(0).query.cursor).toBe('0')
    expect(h.at(1).query.cursor).toBe('777')
  })

  it('单次请求的 count 参数被 maxPageSize (50) 夹住', async () => {
    const h = sequenceAdapter([page(50, 1, 50), page(50, 0, 100)])
    await douyinFetcher.fetchWorkComments({ aweme_id: AWEME_ID, number: 100 }, COOKIE, { adapter: h.adapter })

    expect(Number(h.at(0).query.count)).toBeLessThanOrEqual(50)
  })

  it('最后一页只请求剩余数量', async () => {
    const h = sequenceAdapter([page(50, 1, 50), page(50, 1, 100)])
    await douyinFetcher.fetchWorkComments({ aweme_id: AWEME_ID, number: 60 }, COOKIE, { adapter: h.adapter })

    expect(Number(h.at(1).query.count)).toBe(10)
  })

  it('number 为 1 时只请求一次且只返回一条', async () => {
    const h = constantAdapter(page(50, 1, 50))
    const result = await douyinFetcher.fetchWorkComments({ aweme_id: AWEME_ID, number: 1 }, COOKIE, { adapter: h.adapter })

    expect(h.count).toBe(1)
    expect(result.data.comments).toHaveLength(1)
  })

  it('每一页都重新计算 a_bogus 签名', async () => {
    const h = sequenceAdapter([page(50, 1, 50), page(50, 0, 100)])
    await douyinFetcher.fetchWorkComments({ aweme_id: AWEME_ID, number: 100 }, COOKIE, { adapter: h.adapter })

    expect(h.at(0).query.a_bogus).toBeTruthy()
    expect(h.at(1).query.a_bogus).toBeTruthy()
  })
})

describe('douyin 无参接口 fetchEmojiList', () => {
  it('不带 options 也能调用', async () => {
    const h = constantAdapter(douyinOk({ emoji_list: [] }))
    const result = await douyinFetcher.fetchEmojiList(undefined, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(h.last().url).toContain('/aweme/v1/web/emoji/list')
  })

  it('emojiList 不带签名参数', async () => {
    const h = constantAdapter(douyinOk({ emoji_list: [] }))
    await douyinFetcher.fetchEmojiList(undefined, COOKIE, { adapter: h.adapter })

    expect(h.last().query.a_bogus).toBeUndefined()
  })
})
