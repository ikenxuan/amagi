/**
 * 抖音 Fetcher 模块入口
 * @module fetchers/douyin
 */

// 导入所有函数用于组装 fetcher 对象
import { fetchCommentReplies, fetchWorkComments } from './comment'
import { fetchDynamicEmojiList, fetchEmojiList, fetchLiveRoomInfo, fetchMusicInfo, requestLoginQrcode } from './misc'
import { fetchSuggestWords, searchContent } from './search'
import type { IDouyinFetcher } from './types'
import { fetchUserProfile, fetchUserVideoList } from './user'
import { fetchDanmakuList, fetchImageAlbumWork, fetchSlidesWork, fetchTextWork, fetchVideoWork, parseWork } from './video'

// 导出所有 API 函数
export * from './comment'
export * from './misc'
export * from './search'
export * from './user'
export * from './video'

// 导出绑定函数和类型
export type { IBoundDouyinFetcher } from './bound'
export { createBoundDouyinFetcher } from './bound'

// 导出接口类型
export type { IDouyinFetcher } from './types'

/**
 * 抖音数据获取器
 * 包含所有抖音 API 方法，调用时需要传递 cookie
 * @example
 * ```typescript
 * import { douyinFetcher } from '@ikenxuan/amagi'
 *
 * const result = await douyinFetcher.fetchVideoWork({ aweme_id: '7123456789' }, cookie)
 * ```
 */
export const douyinFetcher: IDouyinFetcher = {
  // 作品
  fetchVideoWork,
  fetchImageAlbumWork,
  fetchSlidesWork,
  fetchTextWork,
  parseWork,
  fetchDanmakuList,

  // 评论
  fetchWorkComments,
  fetchCommentReplies,

  // 用户
  fetchUserProfile,
  fetchUserVideoList,

  // 搜索
  searchContent,
  fetchSuggestWords,

  // 其他
  fetchMusicInfo,
  fetchLiveRoomInfo,
  requestLoginQrcode,
  fetchEmojiList,
  fetchDynamicEmojiList
}

/** 抖音 Fetcher 类型 */
export type DouyinFetcher = typeof douyinFetcher

/** 绑定 Cookie 的抖音 Fetcher 类型 */
export type BoundDouyinFetcher = import('./bound').IBoundDouyinFetcher
