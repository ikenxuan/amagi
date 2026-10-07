import type { EndpointCtx } from '../../contracts/endpoint'
import type { HeadersInput } from '../../contracts/request'
import { AmagiHeaders } from '../../contracts/request'
/**
 * 抖音 Referer 注入 helper。
 *
 * 十一个端点的 `build` 都调它：六个页面类（userProfile / userVideoList /
 * userFavoriteList / userRecommendList / suggestWords / search）与五个作品类
 * （parseWork / videoWork / imageAlbumWork / slidesWork / textWork）。
 *
 * 语义：**调用方在 `requestConfig.headers` 里显式传了 Referer 就不注入**。
 * 判断走 `AmagiHeaders.has('referer')`，大小写不敏感。
 */

/** 需要 Referer 的页面形状 */
export type DouyinRefererPage =
  | { kind: 'user'; secUid: string }
  | { kind: 'video'; awemeId: string }
  | { kind: 'search'; query: string; type?: 'user' | 'video' }
  | { kind: 'searchSuggest'; query: string }
  | { kind: 'live'; webRid: string }

/**
 * 构造抖音页面 URL。
 * @param page - 页面形状
 * @returns 对应的页面地址
 */
export const douyinRefererUrl = (page: DouyinRefererPage): string => {
  switch (page.kind) {
    case 'user':
      return `https://www.douyin.com/user/${page.secUid}`
    case 'video':
      return `https://www.douyin.com/video/${page.awemeId}`
    case 'search': {
      const query = encodeURIComponent(String(page.query))
      if (page.type === 'user') return `https://www.douyin.com/search/${query}?type=user`
      if (page.type === 'video') return `https://www.douyin.com/search/${query}?type=video`
      return `https://www.douyin.com/root/search/${query}`
    }
    case 'searchSuggest':
      return `https://www.douyin.com/search/${encodeURIComponent(String(page.query))}`
    case 'live':
      return `https://live.douyin.com/${page.webRid}`
  }
}

/**
 * 注入 Referer：仅当调用方没显式传时才设置。
 *
 * 返回 `HeadersInput` 直接放进 `build` 的 `RequestSpec.headers`；transport
 * 合并顺序是基线 → 调用方 → spec，所以这里不注入时 spec 里没有 Referer，
 * 调用方的值自然生效。
 * @param ctx - 执行上下文（读 `requestConfig.headers` 判断调用方是否已传）
 * @param page - 页面形状
 * @returns 需要写进 spec 的 header（可能为空对象）
 */
export const withDouyinReferer = (ctx: EndpointCtx, page: DouyinRefererPage): Record<string, string> => {
  const callerHeaders = new AmagiHeaders(ctx.requestConfig?.headers as HeadersInput)
  if (callerHeaders.has('referer')) return {}
  return { referer: douyinRefererUrl(page) }
}
