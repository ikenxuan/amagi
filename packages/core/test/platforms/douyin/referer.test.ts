import type { EndpointCtx } from 'amagi/contracts/endpoint'
import { douyinRefererUrl, withDouyinReferer } from 'amagi/platforms/douyin/referer'
/**
 * platforms/douyin/referer 的契约。
 *
 * 判据：**v6 在 `getdata.ts` 里重复 6 次的 Referer 注入收敛成共享 helper**，
 * `userProfile` / `userVideoList` / `userFavoriteList` / `userRecommendList` /
 * `suggestWords` / `search` 六处共用同一实现。语义与 v6 一致：调用方显式传了
 * Referer 就不注入。
 *
 * 2026-10-05 抓包后又加了第七种页面 `video`：浏览器请求作品详情时 Referer 是
 * `/video/<aweme_id>` 而不是首页，五个作品类端点（parseWork / videoWork /
 * imageAlbumWork / slidesWork / textWork）都用它。
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

  it('video 页：https://www.douyin.com/video/{awemeId}', () => {
    expect(douyinRefererUrl({ kind: 'video', awemeId: '7691714748324351242' })).toBe('https://www.douyin.com/video/7691714748324351242')
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

  it('十一个端点的页面形状都能注入', () => {
    const pages: Array<[string, Parameters<typeof douyinRefererUrl>[0]]> = [
      ['userProfile', { kind: 'user', secUid: '1' }],
      ['userVideoList', { kind: 'user', secUid: '1' }],
      ['userFavoriteList', { kind: 'user', secUid: '1' }],
      ['userRecommendList', { kind: 'user', secUid: '1' }],
      ['suggestWords', { kind: 'searchSuggest', query: 'q' }],
      ['search', { kind: 'search', query: 'q' }],
      ['parseWork', { kind: 'video', awemeId: '7' }],
      ['videoWork', { kind: 'video', awemeId: '7' }],
      ['imageAlbumWork', { kind: 'video', awemeId: '7' }],
      ['slidesWork', { kind: 'video', awemeId: '7' }],
      ['textWork', { kind: 'video', awemeId: '7' }]
    ]
    for (const [name, page] of pages) {
      // 每种形状都要真的拿它去注入：早先这里对所有条目都传 `{kind:'user'}`，
      // 于是这个用例恒只测 user 一种，加新形状也拦不住回归
      const headers = withDouyinReferer(makeCtx(), page)
      expect(
        Object.entries(headers).map(([, value]) => value),
        name
      ).toEqual([douyinRefererUrl(page)])
    }
  })

  it('作品类端点注入的是 /video/<aweme_id>，不是首页', async () => {
    const { douyinRegistry } = await import('amagi/platforms/douyin/endpoints')
    const ctx = makeCtx()
    for (const name of ['parseWork', 'videoWork', 'imageAlbumWork', 'slidesWork', 'textWork'] as const) {
      const endpoint = douyinRegistry[name]
      // `build` 在契约里是可选的，直接调过不了 `test:types`：先断言它在，再可选调用
      expect(endpoint.build, name).toBeTypeOf('function')
      const spec = endpoint.build?.({ aweme_id: '7691714748324351242' } as never, ctx) as { headers?: Record<string, string> }
      expect(new Map(Object.entries(spec.headers ?? {})).get('referer'), name).toBe('https://www.douyin.com/video/7691714748324351242')
    }
  })
})
