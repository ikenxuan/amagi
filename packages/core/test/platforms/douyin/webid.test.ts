import { createFetcherFromRegistry } from 'amagi/client/fetcher'
import type { ClientCtx } from 'amagi/client/fetcher'
import { AmagiHeaders, type RawResponse } from 'amagi/contracts/request'
import { douyinRegistry } from 'amagi/platforms/douyin/endpoints'
import { douyinJudge } from 'amagi/platforms/douyin/judge'
import {
  douyinWebidFor,
  observeDouyinWebid,
  rememberDouyinWebid,
  resetDouyinWebidCache,
  WEBID_HEADER,
  withDouyinWebid
} from 'amagi/platforms/douyin/webid'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
import type { AxiosAdapter } from 'axios'
/**
 * platforms/douyin/webid 的契约（#188）。
 *
 * `webid` 是服务端按 ttwid 算好、通过每个响应的 `cookie_ttwidinfo_webid` 头下发的，
 * 客户端算不出来。抖音会拿 query 里的 webid 与 cookie 会话交叉校验，对不上就静默回
 * HTTP 200 + 0 字节 —— 所以**不传安全、传错致命**，判据都围绕这一条：
 * ① 冷启动不带；② 收到头之后带上；③ 换 cookie 不串用；④ 形状不对的值不收。
 */
import { beforeEach, describe, expect, it } from 'vitest'

const URL_NO_WEBID = 'https://www-hj.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=1'

/** 造一个只关心 headers 的 RawResponse */
const resWith = (headers: Record<string, string>): RawResponse => ({
  status: 200,
  headers: new AmagiHeaders(headers),
  body: {},
  durationMs: 1,
  url: URL_NO_WEBID
})

beforeEach(() => resetDouyinWebidCache())

describe('① 冷启动：缓存为空时不注入', () => {
  it('withDouyinWebid 原样返回', () => {
    expect(withDouyinWebid(URL_NO_WEBID, 'ttwid=abc')).toBe(URL_NO_WEBID)
    expect(douyinWebidFor('ttwid=abc')).toBe('')
  })
})

describe('② 收到响应头之后带上', () => {
  it('rememberDouyinWebid 记下来，withDouyinWebid 补进 query', () => {
    rememberDouyinWebid(resWith({ [WEBID_HEADER]: '7351848354471872041' }), 'ttwid=abc; sessionid=x')

    expect(douyinWebidFor('ttwid=abc')).toBe('7351848354471872041')
    const signedUrl = withDouyinWebid(URL_NO_WEBID, 'ttwid=abc')
    expect(new URL(signedUrl).searchParams.get('webid')).toBe('7351848354471872041')
  })

  it('响应头大小写不敏感（AmagiHeaders 的语义）', () => {
    rememberDouyinWebid(resWith({ 'Cookie_TtwidInfo_WebId': '123456' }), 'ttwid=abc')
    expect(douyinWebidFor('ttwid=abc')).toBe('123456')
  })

  it('URL 里已经有 webid 时不覆盖', () => {
    rememberDouyinWebid(resWith({ [WEBID_HEADER]: '7351848354471872041' }), 'ttwid=abc')
    const withOwn = `${URL_NO_WEBID}&webid=999999`
    expect(withDouyinWebid(withOwn, 'ttwid=abc')).toBe(withOwn)
  })

  it('不是绝对 URL 时原样返回，不抛 —— 报错留给签名器的前置校验', () => {
    rememberDouyinWebid(resWith({ [WEBID_HEADER]: '123456' }), 'ttwid=abc')
    expect(withDouyinWebid('/relative?a=1', 'ttwid=abc')).toBe('/relative?a=1')
  })
})

describe('③ 按 ttwid 分键：换 cookie 不串用', () => {
  it('另一个 ttwid 读不到前一个的 webid', () => {
    rememberDouyinWebid(resWith({ [WEBID_HEADER]: '111111' }), 'ttwid=A')
    expect(douyinWebidFor('ttwid=A')).toBe('111111')
    expect(douyinWebidFor('ttwid=B')).toBe('')
    expect(withDouyinWebid(URL_NO_WEBID, 'ttwid=B')).toBe(URL_NO_WEBID)
  })

  it('cookie 里没有 ttwid（或没有 cookie）时不缓存 —— 无从分键', () => {
    rememberDouyinWebid(resWith({ [WEBID_HEADER]: '111111' }), 'sessionid=x')
    rememberDouyinWebid(resWith({ [WEBID_HEADER]: '222222' }), undefined)
    expect(douyinWebidFor('sessionid=x')).toBe('')
    expect(douyinWebidFor(undefined)).toBe('')
  })

  it('ttwid 按名精确匹配，不会被 xttwid 之类骗到', () => {
    rememberDouyinWebid(resWith({ [WEBID_HEADER]: '111111' }), 'xttwid=WRONG; ttwid=RIGHT')
    expect(douyinWebidFor('ttwid=RIGHT')).toBe('111111')
    expect(douyinWebidFor('ttwid=WRONG')).toBe('')
  })
})

describe('④ 形状不对的值一律不收 —— 传错比不传更糟', () => {
  it.each([['abc'], ['123'], [''], ['7351848354471872041x'], ['-123456']])('拒收 %j', (value) => {
    rememberDouyinWebid(resWith({ [WEBID_HEADER]: value }), 'ttwid=abc')
    expect(douyinWebidFor('ttwid=abc')).toBe('')
  })

  it('没有这个响应头时是无操作', () => {
    rememberDouyinWebid(resWith({ 'content-type': 'application/json' }), 'ttwid=abc')
    expect(douyinWebidFor('ttwid=abc')).toBe('')
  })
})

describe('observe 钩子只读、不抛', () => {
  it('响应头畸形到让实现抛错，也不会把异常带出去', () => {
    const broken = {
      status: 200,
      get headers () {
        throw new Error('boom')
      },
      body: {},
      durationMs: 1,
      url: URL_NO_WEBID
    } as unknown as RawResponse

    expect(() => observeDouyinWebid(broken, { cookie: 'ttwid=abc' })).not.toThrow()
  })
})

describe('端到端：第一次不带、第二次带上', () => {
  const makeCtx = (adapter: AxiosAdapter, cookie: string): ClientCtx => {
    const trace = new TraceCollector()
    const http = new HttpClient({ trace, requestConfig: { adapter } })
    return {
      clientId: 'client-1',
      platform: 'douyin',
      cookie,
      userAgent: 'ua/1',
      requestConfig: {},
      trace,
      // 直通签名器：不注入 webid，用来证明注入点确实在签名器里
      // （`signers: undefined` 不行 —— execute 会在 sign 阶段抛「未注册的签名器」）
      signers: { 'a-bogus': (spec) => spec, 'x-bogus': (spec) => spec },
      judge: douyinJudge,
      observe: observeDouyinWebid,
      send: (spec, reason) => http.send(spec, reason)
    }
  }

  /** 每次响应都回 webid 头，并记下请求 URL */
  const recordingAdapter = (): { adapter: AxiosAdapter; urls: string[] } => {
    const urls: string[] = []
    return {
      adapter: async (config) => {
        urls.push(config.url ?? '')
        return {
          data: { status_code: 0, aweme_detail: { aweme_id: '1' } },
          status: 200,
          statusText: 'OK',
          headers: { [WEBID_HEADER]: '7351848354471872041' },
          config: config as never
        }
      },
      urls
    }
  }

  it('直通签名器时两次都不带 —— 注入点确实在签名器里', async () => {
    const h = recordingAdapter()
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx(h.adapter, 'ttwid=abc'))

    await fetcher.parseWork({ aweme_id: '1' })
    await fetcher.parseWork({ aweme_id: '1' })

    expect(h.urls).toHaveLength(2)
    for (const url of h.urls) expect(new URL(url).searchParams.get('webid')).toBeNull()
    // 但头已经被 observe 收下了
    expect(douyinWebidFor('ttwid=abc')).toBe('7351848354471872041')
  })

  it('接上真签名器：第一次不带，第二次带上，换 cookie 又回到不带', async () => {
    const { createDouyinSigners } = await import('amagi/platforms/douyin/sign/signers')
    const h = recordingAdapter()
    const ctx = { ...makeCtx(h.adapter, 'ttwid=abc'), signers: createDouyinSigners() }
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, ctx)

    await fetcher.parseWork({ aweme_id: '1' })
    expect(new URL(h.urls[0]).searchParams.get('webid')).toBeNull() // 冷启动

    await fetcher.parseWork({ aweme_id: '1' })
    expect(new URL(h.urls[1]).searchParams.get('webid')).toBe('7351848354471872041')

    const other = createFetcherFromRegistry('douyin', douyinRegistry, {
      ...makeCtx(h.adapter, 'ttwid=zzz'),
      signers: createDouyinSigners()
    })
    await other.parseWork({ aweme_id: '1' })
    expect(new URL(h.urls[2]).searchParams.get('webid')).toBeNull() // 不串用
  })
})
