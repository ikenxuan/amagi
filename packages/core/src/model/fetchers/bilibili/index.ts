/**
 * B站 Fetcher 模块入口（阶段 6 起从 v7 registry 派生）。
 *
 * v6 这里是「27 个手写方法函数（video.ts 等，内部走 internal → getdata）+
 * 对象字面量组装 + bound.ts 逐条转发」。阶段 6 删掉整层 v6 机械：
 * `bilibiliFetcher`（静态）与 `createBoundBilibiliFetcher` 都由
 * `bilibiliRegistry` 派生，方法与 client 上的 fetcher 走同一条执行管线。
 * 27 个端点与 v6 方法一一对应（含 convertAvToBv / convertBvToAv /
 * requestLoginQrcode 等不规则映射，见 client/method-names.ts）。
 *
 * v6 的 7 个登录方法（fetchLoginStatus / requestLoginQrcode 等）在阶段 5
 * 已标 @deprecated 指向新会话 API（client.bilibili.login）；它们仍以端点
 * 形式存在于 registry 上，方法名不变。
 * @module fetchers/bilibili
 */

import type { RequestConfig } from '../../../contracts/request'
import { createFetcherFromRegistry } from '../../../client/fetcher'
import { makeClientCtx } from '../../../client/runtime'
import { createStaticFetcher } from '../../../client/static'
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
export const bilibiliFetcher = createStaticFetcher('bilibili', bilibiliRegistry)

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
): ReturnType<typeof createFetcherFromRegistry<'bilibili', typeof bilibiliRegistry>> =>
  createFetcherFromRegistry('bilibili', bilibiliRegistry, makeClientCtx('bilibili', cookie, requestConfig, 'bound-bilibili'))

/** 绑定 Cookie 的B站 Fetcher 类型 */
export type BoundBilibiliFetcher = ReturnType<typeof createBoundBilibiliFetcher>
