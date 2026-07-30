/**
 * 抖音绑定 Cookie 的 Fetcher 接口定义和工厂函数
 * @module fetchers/douyin/bound
 */

import { RequestConfig } from 'amagi/server'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'

import type { BoundMethodOverload, BoundNoParamMethodOverload } from '../shared/overload-types'
import { resolveBoundRequest } from '../shared/request-config'
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
  DouyinUserListOptions,
  DouyinUserOptions,
  DouyinWorkOptions
} from './types'
import { fetchUserFavoriteList, fetchUserProfile, fetchUserRecommendList, fetchUserVideoList } from './user'
import { fetchDanmakuList, fetchImageAlbumWork, fetchSlidesWork, fetchTextWork, fetchVideoWork, parseWork } from './video'

/**
 * 绑定了 Cookie 的抖音 Fetcher 接口
 * 调用方法时无需传递 cookie 参数
 */
export interface IBoundDouyinFetcher {
  // ==================== 作品相关 ====================

  /** 获取抖音视频作品数据 */
  fetchVideoWork: BoundMethodOverload<DouyinWorkOptions, DouyinReturnTypeMap['videoWork']>

  /** 获取抖音图集作品数据 */
  fetchImageAlbumWork: BoundMethodOverload<DouyinWorkOptions, DouyinReturnTypeMap['imageAlbumWork']>

  /** 获取抖音合辑作品数据 */
  fetchSlidesWork: BoundMethodOverload<DouyinWorkOptions, DouyinReturnTypeMap['slidesWork']>

  /** 获取抖音文字作品数据 */
  fetchTextWork: BoundMethodOverload<DouyinWorkOptions, DouyinReturnTypeMap['textWork']>

  /** 聚合解析抖音作品数据 (自动识别作品类型) */
  parseWork: BoundMethodOverload<DouyinWorkOptions, DouyinReturnTypeMap['parseWork']>

  /** 获取抖音视频弹幕数据 */
  fetchDanmakuList: BoundMethodOverload<DouyinDanmakuOptions, DouyinReturnTypeMap['danmakuList']>

  // ==================== 评论相关 ====================

  /** 获取抖音作品评论数据 */
  fetchWorkComments: BoundMethodOverload<DouyinCommentsOptions, DouyinReturnTypeMap['comments']>

  /** 获取抖音指定评论的回复数据 */
  fetchCommentReplies: BoundMethodOverload<DouyinCommentRepliesOptions, DouyinReturnTypeMap['commentReplies']>

  // ==================== 用户相关 ====================

  /** 获取抖音用户主页数据 */
  fetchUserProfile: BoundMethodOverload<DouyinUserOptions, DouyinReturnTypeMap['userProfile']>

  /** 获取抖音用户视频列表数据 */
  fetchUserVideoList: BoundMethodOverload<DouyinUserListOptions, DouyinReturnTypeMap['userVideoList']>

  /** 获取抖音用户喜欢列表数据 */
  fetchUserFavoriteList: BoundMethodOverload<DouyinUserListOptions, DouyinReturnTypeMap['userFavoriteList']>

  /** 获取抖音用户推荐列表数据 */
  fetchUserRecommendList: BoundMethodOverload<DouyinUserListOptions, DouyinReturnTypeMap['userRecommendList']>

  // ==================== 搜索相关 ====================

  /** 抖音搜索内容 */
  searchContent: BoundMethodOverload<DouyinSearchOptions, DouyinReturnTypeMap['search']>

  /** 获取抖音热词/搜索建议 */
  fetchSuggestWords: BoundMethodOverload<DouyinSuggestWordsOptions, DouyinReturnTypeMap['suggestWords']>

  // ==================== 其他 ====================

  /** 获取抖音音乐数据 */
  fetchMusicInfo: BoundMethodOverload<DouyinMusicOptions, DouyinReturnTypeMap['musicInfo']>

  /** 获取抖音直播间信息 */
  fetchLiveRoomInfo: BoundMethodOverload<DouyinLiveRoomOptions, DouyinReturnTypeMap['liveRoomInfo']>

  /** 申请抖音登录二维码 */
  requestLoginQrcode: BoundMethodOverload<DouyinQrcodeOptions, DouyinReturnTypeMap['loginQrcode']>

  /** 获取抖音表情列表 */
  fetchEmojiList: BoundNoParamMethodOverload<DouyinReturnTypeMap['emojiList']>

  /** 获取抖音动态表情列表 */
  fetchDynamicEmojiList: BoundNoParamMethodOverload<DouyinReturnTypeMap['dynamicEmojiList']>
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
export function createBoundDouyinFetcher(cookie: string, requestConfig?: RequestConfig): IBoundDouyinFetcher {
  const resolveRequest = (override?: RequestConfig) => resolveBoundRequest(cookie, requestConfig, override)

  return {
    // 作品
    fetchVideoWork: (options, override) => fetchVideoWork(options, ...resolveRequest(override)),
    fetchImageAlbumWork: (options, override) => fetchImageAlbumWork(options, ...resolveRequest(override)),
    fetchSlidesWork: (options, override) => fetchSlidesWork(options, ...resolveRequest(override)),
    fetchTextWork: (options, override) => fetchTextWork(options, ...resolveRequest(override)),
    parseWork: (options, override) => parseWork(options, ...resolveRequest(override)),
    fetchDanmakuList: (options, override) => fetchDanmakuList(options, ...resolveRequest(override)),

    // 评论
    fetchWorkComments: (options, override) => fetchWorkComments(options, ...resolveRequest(override)),
    fetchCommentReplies: (options, override) => fetchCommentReplies(options, ...resolveRequest(override)),

    // 用户
    fetchUserProfile: (options, override) => fetchUserProfile(options, ...resolveRequest(override)),
    fetchUserVideoList: (options, override) => fetchUserVideoList(options, ...resolveRequest(override)),
    fetchUserFavoriteList: (options, override) => fetchUserFavoriteList(options, ...resolveRequest(override)),
    fetchUserRecommendList: (options, override) => fetchUserRecommendList(options, ...resolveRequest(override)),

    // 搜索
    searchContent: (options, override) => searchContent(options, ...resolveRequest(override)),
    fetchSuggestWords: (options, override) => fetchSuggestWords(options, ...resolveRequest(override)),

    // 其他
    fetchMusicInfo: (options, override) => fetchMusicInfo(options, ...resolveRequest(override)),
    fetchLiveRoomInfo: (options, override) => fetchLiveRoomInfo(options, ...resolveRequest(override)),
    requestLoginQrcode: (options, override) => requestLoginQrcode(options, ...resolveRequest(override)),
    fetchEmojiList: (options, override) => fetchEmojiList(options, ...resolveRequest(override)),
    fetchDynamicEmojiList: (options, override) => fetchDynamicEmojiList(options, ...resolveRequest(override))
  }
}
