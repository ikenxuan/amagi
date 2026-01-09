/**
 * 抖音绑定 Cookie 的 Fetcher 接口定义和工厂函数
 * @module fetchers/douyin/bound
 */

import { RequestConfig } from 'amagi/server'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { Result } from 'amagi/validation'

import type { BaseRequestOptions } from '../types'
import { fetchCommentReplies, fetchWorkComments } from './comment'
import { fetchDynamicEmojiList, fetchEmojiList, fetchLiveRoomInfo, fetchMusicInfo, requestLoginQrcode } from './misc'
import { fetchSuggestWords, searchContent } from './search'
import type {
  DouyinCommentRepliesOptions,
  DouyinCommentsOptions,
  DouyinDanmakuOptions,
  DouyinLiveRoomOptions,
  DouyinMusicOptions,
  DouyinQrcodeOptions,
  DouyinSearchOptions,
  DouyinSuggestWordsOptions,
  DouyinUserOptions,
  DouyinWorkOptions
} from './types'
import { fetchUserProfile, fetchUserVideoList } from './user'
import { fetchDanmakuList, fetchImageAlbumWork, fetchSlidesWork, fetchTextWork, fetchVideoWork, parseWork } from './video'

/**
 * 绑定了 Cookie 的抖音 Fetcher 接口
 * 调用方法时无需传递 cookie 参数
 */
export interface IBoundDouyinFetcher {
  // ==================== 作品相关 ====================

  /** 获取抖音视频作品数据 */
  fetchVideoWork: {
    (options: DouyinWorkOptions & { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['videoWork']>>
    (options: DouyinWorkOptions): Promise<Result<any>>
  }

  /** 获取抖音图集作品数据 */
  fetchImageAlbumWork: {
    (options: DouyinWorkOptions & { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['imageAlbumWork']>>
    (options: DouyinWorkOptions): Promise<Result<any>>
  }

  /** 获取抖音合辑作品数据 */
  fetchSlidesWork: {
    (options: DouyinWorkOptions & { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['slidesWork']>>
    (options: DouyinWorkOptions): Promise<Result<any>>
  }

  /** 获取抖音文字作品数据 */
  fetchTextWork: {
    (options: DouyinWorkOptions & { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['textWork']>>
    (options: DouyinWorkOptions): Promise<Result<any>>
  }

  /** 聚合解析抖音作品数据 (自动识别作品类型) */
  parseWork: {
    (options: DouyinWorkOptions & { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['parseWork']>>
    (options: DouyinWorkOptions): Promise<Result<any>>
  }

  /** 获取抖音视频弹幕数据 */
  fetchDanmakuList: {
    (options: DouyinDanmakuOptions & { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['danmakuList']>>
    (options: DouyinDanmakuOptions): Promise<Result<any>>
  }

  // ==================== 评论相关 ====================

  /** 获取抖音作品评论数据 */
  fetchWorkComments: {
    (options: DouyinCommentsOptions & { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['comments']>>
    (options: DouyinCommentsOptions): Promise<Result<any>>
  }

  /** 获取抖音指定评论的回复数据 */
  fetchCommentReplies: {
    (options: DouyinCommentRepliesOptions & { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['commentReplies']>>
    (options: DouyinCommentRepliesOptions): Promise<Result<any>>
  }

  // ==================== 用户相关 ====================

  /** 获取抖音用户主页数据 */
  fetchUserProfile: {
    (options: DouyinUserOptions & { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['userProfile']>>
    (options: DouyinUserOptions): Promise<Result<any>>
  }

  /** 获取抖音用户视频列表数据 */
  fetchUserVideoList: {
    (options: DouyinUserOptions & { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['userVideoList']>>
    (options: DouyinUserOptions): Promise<Result<any>>
  }

  // ==================== 搜索相关 ====================

  /** 抖音搜索内容 */
  searchContent: {
    (options: DouyinSearchOptions & { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['search']>>
    (options: DouyinSearchOptions): Promise<Result<any>>
  }

  /** 获取抖音热词/搜索建议 */
  fetchSuggestWords: {
    (options: DouyinSuggestWordsOptions & { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['suggestWords']>>
    (options: DouyinSuggestWordsOptions): Promise<Result<any>>
  }

  // ==================== 其他 ====================

  /** 获取抖音音乐数据 */
  fetchMusicInfo: {
    (options: DouyinMusicOptions & { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['musicInfo']>>
    (options: DouyinMusicOptions): Promise<Result<any>>
  }

  /** 获取抖音直播间信息 */
  fetchLiveRoomInfo: {
    (options: DouyinLiveRoomOptions & { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['liveRoomInfo']>>
    (options: DouyinLiveRoomOptions): Promise<Result<any>>
  }

  /** 申请抖音登录二维码 */
  requestLoginQrcode: {
    (options: DouyinQrcodeOptions & { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['loginQrcode']>>
    (options: DouyinQrcodeOptions): Promise<Result<any>>
  }

  /** 获取抖音表情列表 */
  fetchEmojiList: {
    (options: { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['emojiList']>>
    (options?: BaseRequestOptions): Promise<Result<any>>
  }

  /** 获取抖音动态表情列表 */
  fetchDynamicEmojiList: {
    (options: { typeMode: 'strict' }): Promise<Result<DouyinReturnTypeMap['dynamicEmojiList']>>
    (options?: BaseRequestOptions): Promise<Result<any>>
  }
}

/**
 * 创建绑定了 Cookie 和请求配置的抖音 Fetcher
 * @param cookie - 抖音 Cookie
 * @param requestConfig - 请求配置 (可选)
 * @returns 绑定了 Cookie 的 Fetcher 对象，调用时无需传递 cookie
 * @example
 * ```typescript
 * const fetcher = createBoundDouyinFetcher('your_cookie')
 * const result = await fetcher.fetchVideoWork({ aweme_id: '7123456789' })
 * // 严格模式
 * const strictResult = await fetcher.fetchVideoWork({ aweme_id: '7123456789', typeMode: 'strict' })
 * ```
 */
export function createBoundDouyinFetcher (
  cookie: string,
  requestConfig?: RequestConfig
): IBoundDouyinFetcher {
  return {
    // 作品
    fetchVideoWork: (options) => fetchVideoWork(options, cookie, requestConfig),
    fetchImageAlbumWork: (options) => fetchImageAlbumWork(options, cookie, requestConfig),
    fetchSlidesWork: (options) => fetchSlidesWork(options, cookie, requestConfig),
    fetchTextWork: (options) => fetchTextWork(options, cookie, requestConfig),
    parseWork: (options) => parseWork(options, cookie, requestConfig),
    fetchDanmakuList: (options) => fetchDanmakuList(options, cookie, requestConfig),

    // 评论
    fetchWorkComments: (options) => fetchWorkComments(options, cookie, requestConfig),
    fetchCommentReplies: (options) => fetchCommentReplies(options, cookie, requestConfig),

    // 用户
    fetchUserProfile: (options) => fetchUserProfile(options, cookie, requestConfig),
    fetchUserVideoList: (options) => fetchUserVideoList(options, cookie, requestConfig),

    // 搜索
    searchContent: (options) => searchContent(options, cookie, requestConfig),
    fetchSuggestWords: (options) => fetchSuggestWords(options, cookie, requestConfig),

    // 其他
    fetchMusicInfo: (options) => fetchMusicInfo(options, cookie, requestConfig),
    fetchLiveRoomInfo: (options) => fetchLiveRoomInfo(options, cookie, requestConfig),
    requestLoginQrcode: (options) => requestLoginQrcode(options, cookie, requestConfig),
    fetchEmojiList: (options) => fetchEmojiList(options, cookie, requestConfig),
    fetchDynamicEmojiList: (options) => fetchDynamicEmojiList(options, cookie, requestConfig)
  }
}
