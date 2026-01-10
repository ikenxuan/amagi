/**
 * 抖音 API 模块 (已废弃)
 *
 * 此模块中的 API 已在 v6 版本废弃
 * 请使用 douyinFetcher 或 client.douyin.fetcher 替代
 *
 * @module platform/douyin/DouyinApi
 * @deprecated v6 已废弃，请使用 fetcher API 替代
 */

import { RequestConfig } from 'amagi/server'
import { checkDeprecation } from 'amagi/utils/deprecation'

/**
 * 创建废弃的 API 存根函数
 */
const createDeprecatedStub = (methodName: string) => {
  return (..._args: any[]): never => {
    checkDeprecation('getDouyinData')
    throw new Error(`douyin.${methodName} 已废弃，请使用 douyinFetcher 替代`)
  }
}

/**
 * 封装了所有抖音相关的API请求，采用对象化的方式组织。
 *
 * @deprecated v6 已废弃，请使用 douyinFetcher 或 client.douyin.fetcher 替代
 */
export const douyin = {
  /** @deprecated 请使用 douyinFetcher.fetchTextWork 替代 */
  getTextWorkInfo: createDeprecatedStub('getTextWorkInfo'),
  /** @deprecated 请使用 douyinFetcher.parseWork 替代 */
  getWorkInfo: createDeprecatedStub('getWorkInfo'),
  /** @deprecated 请使用 douyinFetcher.fetchVideoWork 替代 */
  getVideoWorkInfo: createDeprecatedStub('getVideoWorkInfo'),
  /** @deprecated 请使用 douyinFetcher.fetchImageAlbumWork 替代 */
  getImageAlbumWorkInfo: createDeprecatedStub('getImageAlbumWorkInfo'),
  /** @deprecated 请使用 douyinFetcher.fetchSlidesWork 替代 */
  getSlidesWorkInfo: createDeprecatedStub('getSlidesWorkInfo'),
  /** @deprecated 请使用 douyinFetcher.fetchComments 替代 */
  getComments: createDeprecatedStub('getComments'),
  /** @deprecated 请使用 douyinFetcher.fetchCommentReplies 替代 */
  getCommentReplies: createDeprecatedStub('getCommentReplies'),
  /** @deprecated 请使用 douyinFetcher.fetchUserProfile 替代 */
  getUserProfile: createDeprecatedStub('getUserProfile'),
  /** @deprecated 请使用 douyinFetcher.fetchEmojiList 替代 */
  getEmojiList: createDeprecatedStub('getEmojiList'),
  /** @deprecated 请使用 douyinFetcher.fetchDynamicEmojiList 替代 */
  getEmojiProList: createDeprecatedStub('getEmojiProList'),
  /** @deprecated 请使用 douyinFetcher.fetchUserVideoList 替代 */
  getUserVideos: createDeprecatedStub('getUserVideos'),
  /** @deprecated 请使用 douyinFetcher.fetchMusicInfo 替代 */
  getMusicInfo: createDeprecatedStub('getMusicInfo'),
  /** @deprecated 请使用 douyinFetcher.fetchSuggestWords 替代 */
  getSuggestWords: createDeprecatedStub('getSuggestWords'),
  /** @deprecated 请使用 douyinFetcher.searchContent 替代 */
  search: createDeprecatedStub('search'),
  /** @deprecated 请使用 douyinFetcher.fetchLiveRoomInfo 替代 */
  getLiveRoomInfo: createDeprecatedStub('getLiveRoomInfo'),
  /** @deprecated 请使用 douyinFetcher.fetchDanmakuList 替代 */
  getDanmaku: createDeprecatedStub('getDanmaku'),
  /** @deprecated 请使用 douyinFetcher 的具体方法替代 */
  invoke: createDeprecatedStub('invoke')
}

/**
 * 创建绑定了cookie的抖音API对象
 *
 * @deprecated v6 已废弃，请使用 createBoundDouyinFetcher 替代
 */
export const createBoundDouyinApi = (_cookie: string, _requestConfig: RequestConfig) => {
  return {
    ...douyin,
    getSearchData: createDeprecatedStub('getSearchData')
  }
}

/**
 * 绑定cookie的抖音API对象类型
 */
export type BoundDouyinApi = ReturnType<typeof createBoundDouyinApi>
