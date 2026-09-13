/**
 * B站 Fetcher 模块入口，方法由 `bilibiliRegistry` 派生。
 *
 * `bilibiliFetcher`（静态）与 `createBoundBilibiliFetcher` 都由
 * `bilibiliRegistry` 派生，方法与 client 上的 fetcher 走同一条执行管线。
 * 27 个端点，含 convertAvToBv / convertBvToAv / requestLoginQrcode 等
 * 不规则映射（见 client/method-names.ts）。
 *
 * 7 个登录方法（fetchLoginStatus / requestLoginQrcode 等）已标 @deprecated
 * 指向新会话 API（client.bilibili.login）；它们仍以端点形式存在于 registry
 * 上，方法名不变。
 * @module fetchers/bilibili
 */

import type { RequestConfig } from '../../../contracts/request'
import { createFetcherFromRegistry, type FetcherOf, type SuccessFetcherOf } from '../../../client/fetcher'
import { makeClientCtx } from '../../../client/runtime'
import { createStaticFetcher, type StaticFetcherOf } from '../../../client/static'
import { bilibiliRegistry } from '../../../platforms/bilibili/endpoints'

/**
 * B站数据获取器（静态）。
 * 包含所有 B站 API 方法，调用时需要传递 cookie
 * @example
 * ```typescript
 * import { bilibiliFetcher } from '@ikenxuan/amagi'
 *
 * const result = await bilibiliFetcher.fetchVideoInfo({ bvid: 'BV1xx411c7mD' }, cookie)
 * ```
 */
export const bilibiliFetcher: StaticFetcherOf<'bilibili', typeof bilibiliRegistry> = createStaticFetcher('bilibili', bilibiliRegistry)

/** B站 Fetcher 类型（静态形态：三参签名） */
export type BilibiliFetcher = typeof bilibiliFetcher

/**
 * 创建绑定了 Cookie 和请求配置的B站 Fetcher
 * @param cookie - B站 Cookie
 * @param requestConfig - 请求配置 (可选)
 * @returns 绑定了 Cookie 的 Fetcher 对象，调用时无需传递 cookie
 * @example
 * ```typescript
 * const fetcher = createBoundBilibiliFetcher('your_cookie')
 * const result = await fetcher.fetchVideoInfo({ bvid: 'BV1xx411c7mD' })
 * ```
 */
export const createBoundBilibiliFetcher = (
  cookie: string,
  requestConfig?: RequestConfig
): FetcherOf<'bilibili', typeof bilibiliRegistry> =>
  createFetcherFromRegistry('bilibili', bilibiliRegistry, makeClientCtx('bilibili', cookie, requestConfig, 'bound-bilibili'))

/** 绑定 Cookie 的B站 Fetcher 类型 */
export type BoundBilibiliFetcher = ReturnType<typeof createBoundBilibiliFetcher>

/**
 * 只保留成功分支的B站 fetcher 类型。
 *
 * 给「用一层 Proxy 把失败信封转成异常」的下游封装用：包装后的 fetcher 声明成
 * 这个类型，`.data` 就是 `T` 而不是 `T | undefined`。
 */
export type SuccessBilibiliFetcher = SuccessFetcherOf<'bilibili', typeof bilibiliRegistry>
