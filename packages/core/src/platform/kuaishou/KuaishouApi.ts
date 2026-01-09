/**
 * 快手 API 模块 (已废弃)
 *
 * 此模块中的 API 已在 v6 版本废弃
 * 请使用 kuaishouFetcher 或 client.kuaishou.fetcher 替代
 *
 * @module platform/kuaishou/KuaishouApi
 * @deprecated v6 已废弃，请使用 fetcher API 替代
 */

import { checkDeprecation } from 'amagi/utils/deprecation'
import { RequestConfig } from 'amagi/server'

/**
 * 创建废弃的 API 存根函数
 */
const createDeprecatedStub = (methodName: string) => {
  return (..._args: any[]): never => {
    checkDeprecation('getKuaishouData')
    throw new Error(`kuaishou.${methodName} 已废弃，请使用 kuaishouFetcher 替代`)
  }
}

/**
 * 快手相关 API 的命名空间。
 *
 * @deprecated v6 已废弃，请使用 kuaishouFetcher 或 client.kuaishou.fetcher 替代
 */
export const kuaishou = {
  /** @deprecated 请使用 kuaishouFetcher.fetchVideoWork 替代 */
  getWorkInfo: createDeprecatedStub('getWorkInfo'),
  /** @deprecated 请使用 kuaishouFetcher.fetchComments 替代 */
  getComments: createDeprecatedStub('getComments'),
  /** @deprecated 请使用 kuaishouFetcher.fetchEmojiList 替代 */
  getEmojiList: createDeprecatedStub('getEmojiList')
}

/**
 * 创建绑定了cookie的快手API对象
 *
 * @deprecated v6 已废弃，请使用 createBoundKuaishouFetcher 替代
 */
export const createBoundKuaishouApi = (_cookie: string, _requestConfig: RequestConfig) => {
  return { ...kuaishou }
}

/**
 * 绑定cookie的快手API对象类型
 */
export type BoundKuaishouApi = ReturnType<typeof createBoundKuaishouApi>
