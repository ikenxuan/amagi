import { requestProfileOf, resolveDefaultSign } from 'amagi/client/request/profile'
import { describe, expect, it } from 'vitest'

describe('平台请求档案', () => {
  it('抖音默认 a-bogus，并声明 Argus 重试', () => {
    const p = requestProfileOf('douyin')

    expect(resolveDefaultSign(p, 'GET')).toBe('a-bogus')
    expect(p.retryOn).toEqual(['ANTIBOT_PAGE'])
    expect(p.retryFresh).toBe(true)
  })

  it('B站默认不签名 —— 27 条端点里只有 5 条签', () => {
    expect(resolveDefaultSign(requestProfileOf('bilibili'), 'GET')).toBe(false)
  })

  it('快手默认 hxfalcon', () => {
    expect(resolveDefaultSign(requestProfileOf('kuaishou'), 'POST')).toBe('hxfalcon')
  })

  it('小红书按 method 推：POST 走 body 签名、GET 走 query 签名', () => {
    const p = requestProfileOf('xiaohongshu')

    expect(resolveDefaultSign(p, 'POST')).toBe('xhs-post')
    expect(resolveDefaultSign(p, 'GET')).toBe('xhs-get')
  })
})

describe('抖音 retryFresh 的刷新钩子', () => {
  const url = 'https://www.douyin.com/aweme/v1/web/comment/list/?aweme_id=1&msToken=AAAA'

  it('URL 里有 msToken 时换一个新的，长度不变', () => {
    const spec = { method: 'GET' as const, url }
    const next = requestProfileOf('douyin').refresh!(spec)
    const before = new URL(url).searchParams.get('msToken')!
    const after = new URL(next.url).searchParams.get('msToken')!

    expect(after).not.toBe(before)
    expect(after.length).toBe(before.length)
    // 其余 query 一个不动
    expect(new URL(next.url).searchParams.get('aweme_id')).toBe('1')
  })

  it('URL 里没有 msToken 时原样返回（我们这一层不补参数）', () => {
    const spec = { method: 'GET' as const, url: 'https://www.douyin.com/aweme/v1/web/x/?a=1' }

    expect(requestProfileOf('douyin').refresh!(spec)).toBe(spec)
  })

  it('相对 URL 原样返回，不抛', () => {
    const spec = { method: 'GET' as const, url: '/aweme/v1/web/x/' }

    expect(() => requestProfileOf('douyin').refresh!(spec)).not.toThrow()
    expect(requestProfileOf('douyin').refresh!(spec)).toBe(spec)
  })
})
