import { kuaishouFetcher, xiaohongshuFetcher } from 'amagi/model/fetchers'
import { describe, expect, it } from 'vitest'

import { constantAdapter } from '../helpers/adapter'
import { xiaohongshuOk } from '../helpers/fixtures'

const KS_COOKIE = 'did=web_abc; kuaishou.server.web_st=xyz'
const XHS_COOKIE = 'a1=1900abcdef; web_session=040069'

describe('kuaishou fetchVideoWork', () => {
  it('走 POST graphql 并返回成功 Result', async () => {
    const h = constantAdapter({ data: { visionVideoDetail: { photo: { id: 'p1' } } } })
    const result = await kuaishouFetcher.fetchVideoWork({ photoId: 'p1' }, KS_COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(h.last().method).toBe('post')
  })

  it('请求体是 JSON 且含 operationName / query / variables', async () => {
    const h = constantAdapter({ data: {} })
    await kuaishouFetcher.fetchVideoWork({ photoId: 'p1' }, KS_COOKIE, { adapter: h.adapter })

    const body = typeof h.last().data === 'string' ? JSON.parse(h.last().data as string) : h.last().data
    expect(body).toHaveProperty('query')
    expect(body).toHaveProperty('variables')
  })

  it('cookie 与 Origin / Referer 头就位', async () => {
    const h = constantAdapter({ data: {} })
    await kuaishouFetcher.fetchVideoWork({ photoId: 'p1' }, KS_COOKIE, { adapter: h.adapter })

    expect(h.last().headers.Cookie).toBe(KS_COOKIE)
    expect(h.last().headers.Origin).toBe('https://www.kuaishou.com')
    expect(h.last().headers.Referer).toContain('kuaishou.com')
  })

  it('默认 Content-Type 为 application/json', async () => {
    const h = constantAdapter({ data: {} })
    await kuaishouFetcher.fetchVideoWork({ photoId: 'p1' }, KS_COOKIE, { adapter: h.adapter })

    expect(h.last().headers['Content-Type']).toBe('application/json')
  })

  it('参数校验失败时抛错', async () => {
    const h = constantAdapter({ data: {} })
    await expect(kuaishouFetcher.fetchVideoWork({ photoId: '' }, KS_COOKIE, { adapter: h.adapter })).rejects.toThrow(/快手数据获取失败/)
    expect(h.count).toBe(0)
  })

  it('KNOWN-DEFECT: 快手默认 UA 带 Edg 标识，但 networks 只清理大写 User-Agent，故此处会被清理', async () => {
    const h = constantAdapter({ data: {} })
    await kuaishouFetcher.fetchVideoWork({ photoId: 'p1' }, KS_COOKIE, { adapter: h.adapter })

    expect(h.last().headers['User-Agent']).not.toContain('Edg/')
  })
})

describe('kuaishou fetchEmojiList', () => {
  it('不带 options 也能调用', async () => {
    const h = constantAdapter({ data: { emojiPackageList: [] } })
    const result = await kuaishouFetcher.fetchEmojiList(undefined, KS_COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
  })
})

describe('kuaishou 错误路径', () => {
  it('命中 kuaishouAPIErrorCode 的 code 时返回失败 Result', async () => {
    const h = constantAdapter({ code: 'INVALID_COOKIE', amagiError: { errorDescription: 'ck 失效' } })
    const result = await kuaishouFetcher.fetchVideoWork({ photoId: 'p1' }, KS_COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    expect(result.message).toBe('快手数据获取失败')
  })

  it('未命中枚举的 code 被当成成功', async () => {
    const h = constantAdapter({ code: 12345, data: {} })
    const result = await kuaishouFetcher.fetchVideoWork({ photoId: 'p1' }, KS_COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
  })

  // `rawData.code &&` 会在 code 为 0 时短路，因此 code: 0 永远判成功。
  it('KNOWN-DEFECT: code 为 0 时因短路求值而必然判成功', async () => {
    const h = constantAdapter({ code: 0, data: {} })
    const result = await kuaishouFetcher.fetchVideoWork({ photoId: 'p1' }, KS_COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
  })
})

describe('xiaohongshu fetchHomeFeed', () => {
  it('走 POST 并返回成功 Result', async () => {
    const h = constantAdapter(xiaohongshuOk({ data: { items: [] } }))
    const result = await xiaohongshuFetcher.fetchHomeFeed({}, XHS_COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(h.last().method).toBe('post')
  })

  it('注入 x-s / x-t / x-s-common 三个签名头', async () => {
    const h = constantAdapter(xiaohongshuOk({ data: {} }))
    await xiaohongshuFetcher.fetchHomeFeed({}, XHS_COOKIE, { adapter: h.adapter })

    const headers = h.last().headers
    expect(headers['x-s']).toBeTruthy()
    expect(headers['x-t']).toBeTruthy()
    expect(headers['x-s-common']).toBeTruthy()
  })

  it('cookie 写入小写 cookie 头（与其他三个平台的大写不同）', async () => {
    const h = constantAdapter(xiaohongshuOk({ data: {} }))
    await xiaohongshuFetcher.fetchHomeFeed({}, XHS_COOKIE, { adapter: h.adapter })

    expect(h.last().headers.cookie).toBe(XHS_COOKIE)
    expect(h.last().headers.Cookie).toBeUndefined()
  })

  // 因为 header 是小写，networks.ts 的 cleanUserAgent 不会命中。
  it('KNOWN-DEFECT: 小红书默认 UA 的 Edg 标识未被清理', async () => {
    const h = constantAdapter(xiaohongshuOk({ data: {} }))
    await xiaohongshuFetcher.fetchHomeFeed({}, XHS_COOKIE, { adapter: h.adapter })

    expect(h.last().headers['user-agent']).toContain('Edg/')
  })

  it('请求体是 JSON 字符串', async () => {
    const h = constantAdapter(xiaohongshuOk({ data: {} }))
    await xiaohongshuFetcher.fetchHomeFeed({}, XHS_COOKIE, { adapter: h.adapter })

    expect(typeof h.last().data).toBe('string')
    expect(() => JSON.parse(h.last().data as string)).not.toThrow()
  })
})

describe('xiaohongshu fetchNoteDetail', () => {
  it('note_id 与 xsec_token 进入请求体', async () => {
    const h = constantAdapter(xiaohongshuOk({ data: { items: [] } }))
    await xiaohongshuFetcher.fetchNoteDetail({ note_id: 'n1', xsec_token: 'tk' }, XHS_COOKIE, { adapter: h.adapter })

    const body = JSON.parse(h.last().data as string)
    expect(JSON.stringify(body)).toContain('n1')
  })

  it('参数校验失败时抛错', async () => {
    const h = constantAdapter(xiaohongshuOk({}))
    await expect(xiaohongshuFetcher.fetchNoteDetail({ note_id: 'n1' } as never, XHS_COOKIE, { adapter: h.adapter })).rejects.toThrow(
      /小红书数据获取失败/
    )
    expect(h.count).toBe(0)
  })
})

describe('xiaohongshu 错误路径', () => {
  it.each([300011, 300012, 300013, 300015, 500])('code %i 命中错误枚举，返回失败 Result', async (code) => {
    const h = constantAdapter({ code, amagiError: { errorDescription: 'x' } })
    const result = await xiaohongshuFetcher.fetchHomeFeed({}, XHS_COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
  })

  it('code 非 0 一律判失败，无论具体值', async () => {
    const h = constantAdapter({ code: 999999, data: {} })
    const result = await xiaohongshuFetcher.fetchHomeFeed({}, XHS_COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
  })

  // xhs 的 GlobalGetData 把一切异常都归一化为 code: 500，
  // 而 xiaohongshuAPIErrorCode.ILLEGAL_REQUEST 恰好就是 500 ——
  // 于是「非法请求」这个具体错误码和「任意内部异常」无法区分。
  it('KNOWN-DEFECT: 任意失败都被归一化为 code 500，与 ILLEGAL_REQUEST 撞码', async () => {
    const h = constantAdapter({ code: 300013, data: { msg: '访问频次异常' } })
    const result = await xiaohongshuFetcher.fetchHomeFeed({}, XHS_COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    expect((result.error as unknown as { errorDescription: string }).errorDescription).toContain('300013')
  })

  it('返回 HTML 时原样透出（反爬页面），不抛错', async () => {
    const h = constantAdapter('<html><body>captcha</body></html>')
    const result = await xiaohongshuFetcher.fetchHomeFeed({}, XHS_COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(result.data).toContain('<html>')
  })
})
