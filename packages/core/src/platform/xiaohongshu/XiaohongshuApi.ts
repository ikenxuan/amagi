/**
 * 小红书 API 模块 (已废弃)
 *
 * 此模块中的 API 已在 v6 版本废弃
 * 请使用 xiaohongshuFetcher 或 client.xiaohongshu.fetcher 替代
 *
 * @module platform/xiaohongshu/XiaohongshuApi
 * @deprecated v6 已废弃，请使用 fetcher API 替代
 */

import { checkDeprecation } from 'amagi/utils/deprecation'
import { RequestConfig } from 'amagi/server'

/**
 * 创建废弃的 API 存根函数
 */
const createDeprecatedStub = (methodName: string) => {
  return (..._args: any[]): never => {
    checkDeprecation('getXiaohongshuData')
    throw new Error(`xiaohongshu.${methodName} 已废弃，请使用 xiaohongshuFetcher 替代`)
  }
}

/**
 * 封装了所有小红书相关的API请求，采用对象化的方式组织。
 *
 * @deprecated v6 已废弃，请使用 xiaohongshuFetcher 或 client.xiaohongshu.fetcher 替代
 */
export const xiaohongshu = {
  /** @deprecated 请使用 xiaohongshuFetcher.fetchHomeFeed 替代 */
  getHomeFeed: createDeprecatedStub('getHomeFeed'),
  /** @deprecated 请使用 xiaohongshuFetcher.fetchNoteDetail 替代 */
  getNote: createDeprecatedStub('getNote'),
  /** @deprecated 请使用 xiaohongshuFetcher.fetchNoteComments 替代 */
  getComments: createDeprecatedStub('getComments'),
  /** @deprecated 请使用 xiaohongshuFetcher.fetchUserProfile 替代 */
  getUser: createDeprecatedStub('getUser'),
  /** @deprecated 请使用 xiaohongshuFetcher.fetchUserNoteList 替代 */
  getUserNotes: createDeprecatedStub('getUserNotes'),
  /** @deprecated 请使用 xiaohongshuFetcher.searchNotes 替代 */
  getSearchNotes: createDeprecatedStub('getSearchNotes'),
  /** @deprecated 请使用 xiaohongshuFetcher.fetchEmojiList 替代 */
  getEmojiList: createDeprecatedStub('getEmojiList')
}

/**
 * 创建绑定了cookie的小红书API对象
 *
 * @deprecated v6 已废弃，请使用 createBoundXiaohongshuFetcher 替代
 */
export const createBoundXiaohongshuApi = (_cookie: string, _requestConfig: RequestConfig) => {
  return { ...xiaohongshu }
}

/**
 * 绑定cookie的小红书API对象类型
 */
export type BoundXiaohongshuApi = ReturnType<typeof createBoundXiaohongshuApi>
