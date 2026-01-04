/**
 * 小红书 Fetcher 模块入口
 * @module fetchers/xiaohongshu
 */

import { RequestConfig } from 'amagi/server'

import type {
  XiaohongshuCommentsOptions,
  XiaohongshuHomeFeedOptions,
  XiaohongshuNoteDetailOptions,
  XiaohongshuSearchNotesOptions,
  XiaohongshuUserNotesOptions,
  XiaohongshuUserProfileOptions
} from '../types'
import { fetchEmojiList } from './misc'
import { fetchHomeFeed, fetchNoteComments, fetchNoteDetail } from './note'
import { searchNotes } from './search'
import type { IBoundXiaohongshuFetcher, IXiaohongshuFetcher } from './types'
import { fetchUserNoteList, fetchUserProfile } from './user'

// 导出所有 API 函数
export * from './misc'
export * from './note'
export * from './search'
export * from './user'

// 导出接口类型
export type { IBoundXiaohongshuFetcher, IXiaohongshuFetcher } from './types'

/**
 * 小红书数据获取器
 * 包含所有小红书 API 方法，调用时需要传递 cookie
 * @example
 * ```typescript
 * import { xiaohongshuFetcher } from '@ikenxuan/amagi'
 *
 * const result = await xiaohongshuFetcher.fetchNoteDetail({
 *   note_id: '691db851000000001e037279',
 *   xsec_token: 'xxx'
 * }, cookie)
 * ```
 */
export const xiaohongshuFetcher: IXiaohongshuFetcher = {
  fetchHomeFeed,
  fetchNoteDetail,
  fetchNoteComments,
  fetchUserProfile,
  fetchUserNoteList,
  searchNotes,
  fetchEmojiList
}

/** 小红书 Fetcher 类型 */
export type XiaohongshuFetcher = typeof xiaohongshuFetcher

/**
 * 创建绑定了 Cookie 和请求配置的小红书 Fetcher
 * @param cookie - 小红书 Cookie
 * @param requestConfig - 请求配置 (可选)
 * @returns 绑定了 Cookie 的 Fetcher 对象，调用时无需传递 cookie
 * @example
 * ```typescript
 * const fetcher = createBoundXiaohongshuFetcher('your_cookie')
 * const result = await fetcher.fetchNoteDetail({
 *   note_id: '691db851000000001e037279',
 *   xsec_token: 'xxx'
 * })
 * ```
 */
export function createBoundXiaohongshuFetcher (
  cookie: string,
  requestConfig?: RequestConfig
): IBoundXiaohongshuFetcher {
  return {
    fetchHomeFeed: (options: XiaohongshuHomeFeedOptions = {}) =>
      fetchHomeFeed(options, cookie, requestConfig),
    fetchNoteDetail: (options: XiaohongshuNoteDetailOptions) =>
      fetchNoteDetail(options, cookie, requestConfig),
    fetchNoteComments: (options: XiaohongshuCommentsOptions) =>
      fetchNoteComments(options, cookie, requestConfig),
    fetchUserProfile: (options: XiaohongshuUserProfileOptions) =>
      fetchUserProfile(options, cookie, requestConfig),
    fetchUserNoteList: (options: XiaohongshuUserNotesOptions) =>
      fetchUserNoteList(options, cookie, requestConfig),
    searchNotes: (options: XiaohongshuSearchNotesOptions) =>
      searchNotes(options, cookie, requestConfig),
    fetchEmojiList: (options) =>
      fetchEmojiList(options, cookie, requestConfig)
  }
}

/** 绑定 Cookie 的小红书 Fetcher 类型 */
export type BoundXiaohongshuFetcher = IBoundXiaohongshuFetcher
