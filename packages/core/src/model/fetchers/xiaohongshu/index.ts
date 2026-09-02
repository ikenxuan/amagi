/**
 * 小红书 Fetcher 模块入口（阶段 6 起从 v7 registry 派生）。
 *
 * v6 这里是「7 个手写方法函数（note.ts / user.ts 等，内部走 internal →
 * getdata）+ 对象字面量组装 + bound.ts 逐条转发」。阶段 6 删掉整层 v6
 * 机械：`xiaohongshuFetcher`（静态）与 `createBoundXiaohongshuFetcher`
 * 都由 `xiaohongshuRegistry` 派生，方法与 client 上的 fetcher 走同一条
 * 执行管线。
 * @module fetchers/xiaohongshu
 */

import type { RequestConfig } from '../../../contracts/request'
import { createFetcherFromRegistry } from '../../../client/fetcher'
import { makeClientCtx } from '../../../client/runtime'
import { createStaticFetcher } from '../../../client/static'
import { xiaohongshuRegistry } from '../../../platforms/xiaohongshu/endpoints'

/**
 * 小红书数据获取器（静态）。
 * 包含所有小红书 API 方法，调用时需要传递 cookie
 * @example
 * ```typescript
 * import { xiaohongshuFetcher } from '@ikenxuan/amagi'
 *
 * const result = await xiaohongshuFetcher.fetchNoteDetail({ note_id: 'n1', xsec_token: 'tk' }, cookie)
 * ```
 */
export const xiaohongshuFetcher = createStaticFetcher('xiaohongshu', xiaohongshuRegistry)

/** 小红书 Fetcher 类型（静态形态：三参签名） */
export type XiaohongshuFetcher = typeof xiaohongshuFetcher

/**
 * 创建绑定了 Cookie 和请求配置的小红书 Fetcher
 * @param cookie - 小红书 Cookie
 * @param requestConfig - 请求配置 (可选)
 * @returns 绑定了 Cookie 的 Fetcher 对象，调用时无需传递 cookie
 * @example
 * ```typescript
 * const fetcher = createBoundXiaohongshuFetcher('your_cookie')
 * const result = await fetcher.fetchNoteDetail({ note_id: 'n1', xsec_token: 'tk' })
 * ```
 */
export const createBoundXiaohongshuFetcher = (
  cookie: string,
  requestConfig?: RequestConfig
): ReturnType<typeof createFetcherFromRegistry<'xiaohongshu', typeof xiaohongshuRegistry>> =>
  createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeClientCtx('xiaohongshu', cookie, requestConfig, 'bound-xiaohongshu'))

/** 绑定 Cookie 的小红书 Fetcher 类型 */
export type BoundXiaohongshuFetcher = ReturnType<typeof createBoundXiaohongshuFetcher>
