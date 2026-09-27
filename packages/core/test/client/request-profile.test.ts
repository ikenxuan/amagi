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
