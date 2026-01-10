/**
 * 快手 Fetcher 模块入口
 * @module fetchers/kuaishou
 */

import { RequestConfig } from 'amagi/server'

import { fetchEmojiList, fetchVideoWork, fetchWorkComments } from './api'
import type { IBoundKuaishouFetcher, IKuaishouFetcher } from './types'

// 导出所有 API 函数
export * from './api'

// 导出接口类型
export type { IBoundKuaishouFetcher, IKuaishouFetcher } from './types'

/**
 * 快手数据获取器
 * 包含所有快手 API 方法，调用时需要传递 cookie
 * @example
 * ```typescript
 * import { kuaishouFetcher } from '@ikenxuan/amagi'
 *
 * const result = await kuaishouFetcher.fetchVideoWork({ photoId: '3x123456789' }, cookie)
 * ```
 */
export const kuaishouFetcher = {
  fetchVideoWork,
  fetchWorkComments,
  fetchEmojiList
} as IKuaishouFetcher

/** 快手 Fetcher 类型 */
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
 * // 严格模式
 * const strictResult = await fetcher.fetchVideoWork({ photoId: '3x123456789', typeMode: 'strict' })
 * ```
 */
export function createBoundKuaishouFetcher (
  cookie: string,
  requestConfig?: RequestConfig
): IBoundKuaishouFetcher {
  return {
    fetchVideoWork: (options, reqConfig?: RequestConfig) => fetchVideoWork(options, cookie, reqConfig ?? requestConfig),
    fetchWorkComments: (options, reqConfig?: RequestConfig) => fetchWorkComments(options, cookie, reqConfig ?? requestConfig),
    fetchEmojiList: (options, reqConfig?: RequestConfig) => fetchEmojiList(options, cookie, reqConfig ?? requestConfig)
  }
}

/** 绑定 Cookie 的快手 Fetcher 类型 */
export type BoundKuaishouFetcher = IBoundKuaishouFetcher
