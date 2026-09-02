/**
 * 快手 Fetcher 模块入口（阶段 6 起从 v7 registry 派生）。
 *
 * v6 里快手的 6 个方法函数挤在 api.ts（内部走 internal → getdata），
 * bound 工厂与静态对象都在本文件手写。阶段 6 全部改为派生：
 * `kuaishouFetcher`（静态）与 `createBoundKuaishouFetcher` 都由
 * `kuaishouRegistry` 派生，方法与 client 上的 fetcher 走同一条执行管线。
 * @module fetchers/kuaishou
 */

import type { RequestConfig } from '../../../contracts/request'
import { createFetcherFromRegistry } from '../../../client/fetcher'
import { makeClientCtx } from '../../../client/runtime'
import { createStaticFetcher } from '../../../client/static'
import { kuaishouRegistry } from '../../../platforms/kuaishou/endpoints'

/**
 * 快手数据获取器（静态）。
 * 包含所有快手 API 方法，调用时需要传递 cookie
 * @example
 * ```typescript
 * import { kuaishouFetcher } from '@ikenxuan/amagi'
 *
 * const result = await kuaishouFetcher.fetchVideoWork({ photoId: '3x123456789' }, cookie)
 * ```
 */
export const kuaishouFetcher = createStaticFetcher('kuaishou', kuaishouRegistry)

/** 快手 Fetcher 类型（静态形态：三参签名） */
export type KuaishouFetcher = typeof kuaishouFetcher

/**
 * 创建绑定了 Cookie 和请求配置的快手 Fetcher
 * @param cookie - 快手 Cookie
 * @param requestConfig - 请求配置 (可选)
 * @returns 绑定了 Cookie 的 Fetcher 对象，调用时无需传递 cookie
 * @example
 * ```typescript
 * const fetcher = createBoundKuaishouFetcher('your_cookie')
 * const result = await fetcher.fetchVideoWork({ photoId: '3x123456789' })
 * ```
 */
export const createBoundKuaishouFetcher = (
  cookie: string,
  requestConfig?: RequestConfig
): ReturnType<typeof createFetcherFromRegistry<'kuaishou', typeof kuaishouRegistry>> =>
  createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeClientCtx('kuaishou', cookie, requestConfig, 'bound-kuaishou'))

/** 绑定 Cookie 的快手 Fetcher 类型 */
export type BoundKuaishouFetcher = ReturnType<typeof createBoundKuaishouFetcher>
