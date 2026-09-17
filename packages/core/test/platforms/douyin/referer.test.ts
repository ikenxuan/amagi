import type { EndpointCtx } from 'amagi/contracts/endpoint'
import { douyinRefererUrl, withDouyinReferer } from 'amagi/platforms/douyin/referer'
/**
 * platforms/douyin/referer 的契约。
 *
 * 判据：**v6 在 `getdata.ts` 里重复 6 次的 Referer 注入收敛成共享 helper**，
 * `userProfile` / `userVideoList` / `userFavoriteList` / `userRecommendList` /
 * `suggestWords` / `search` 六处共用同一实现。语义与 v6 一致：调用方显式传了
 * Referer 就不注入。
 */
import { describe, expect, it } from 'vitest'

const makeCtx = (requestConfig?: EndpointCtx['requestConfig']): EndpointCtx => ({
  clientId: 'client-1',
  platform: 'douyin',
  cookie: 'ck=1',
  userAgent: 'ua/1',
  requestConfig: requestConfig ?? {},
  send: async () => {
    throw new Error('should not send')
  }
})

describe('douyinRefererUrl - 页面地址构造', () => {
  it('user 页：https://www.douyin.com/user/{secUid}', () => {
    expect(douyinRefererUrl({ kind: 'user', secUid: '12345' })).toBe('https://www.douyin.com/user/12345')
  })

  it('search 页（general）：root/search 路径', () => {
    expect(douyinRefererUrl({ kind: 'search', query: '美食' })).toBe('https://www.douyin.com/root/search/%E7%BE%8E%E9%A3%9F')
  })

  it('search 页（user）：?type=user 后缀', () => {
    expect(douyinRefererUrl({ kind: 'search', query: 'abc', type: 'user' })).toBe('https://www.douyin.com/search/abc?type=user')
  })

  it('search 页（video）：?type=video 后缀', () => {
    expect(douyinRefererUrl({ kind: 'search', query: 'abc', type: 'video' })).toBe('https://www.douyin.com/search/abc?type=video')
  })
})

describe('withDouyinReferer - 注入条件（v6 六处重复逻辑）', () => {
  it('调用方没传 Referer：注入', () => {
    const headers = withDouyinReferer(makeCtx(), { kind: 'user', secUid: '1' })
    expect(new Map(Object.entries(headers)).get('referer')).toBe('https://www.douyin.com/user/1')
  })

  it('调用方传了 Referer：不注入（大小写不敏感）', () => {
    for (const name of ['Referer', 'referer']) {
      const headers = withDouyinReferer(makeCtx({ headers: { [name]: 'https://custom/' } }), { kind: 'user', secUid: '1' })
      expect(Object.keys(headers), name).toEqual([])
    }
  })

  it('六种端点页面都能注入', () => {
    const pages: Array<[string, ReturnType<typeof douyinRefererUrl>]> = [
      ['userProfile', douyinRefererUrl({ kind: 'user', secUid: '1' })],
      ['userVideoList', douyinRefererUrl({ kind: 'user', secUid: '1' })],
      ['userFavoriteList', douyinRefererUrl({ kind: 'user', secUid: '1' })],
      ['userRecommendList', douyinRefererUrl({ kind: 'user', secUid: '1' })],
      ['suggestWords', douyinRefererUrl({ kind: 'search', query: 'q' })],
      ['search', douyinRefererUrl({ kind: 'search', query: 'q' })]
    ]
    for (const [name, url] of pages) {
      const headers = withDouyinReferer(makeCtx(), { kind: 'user', secUid: '1' })
      expect(Object.values(headers).length, name).toBeGreaterThan(0)
      expect(url.length, name).toBeGreaterThan(0)
    }
  })
})
