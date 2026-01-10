/**
 * B站 Fetcher 模块入口
 * @module fetchers/bilibili
 */

// 导入所有函数用于组装 fetcher 对象
import { fetchArticleCards, fetchArticleContent, fetchArticleInfo, fetchArticleListInfo } from './article'
import { checkQrcodeStatus, fetchLoginStatus, requestCaptchaFromVoucher, requestLoginQrcode, validateCaptchaResult } from './auth'
import { fetchBangumiInfo, fetchBangumiStreamUrl } from './bangumi'
import { fetchCommentReplies, fetchComments } from './comment'
import { fetchDynamicCard, fetchDynamicDetail } from './dynamic'
import { fetchLiveRoomInfo, fetchLiveRoomInitInfo } from './live'
import type { IBilibiliFetcher } from './types'
import { fetchUploaderTotalViews, fetchUserCard, fetchUserDynamicList, fetchUserSpaceInfo } from './user'
import { convertAvToBv, convertBvToAv, fetchEmojiList } from './utils'
import { fetchVideoDanmaku, fetchVideoInfo, fetchVideoStreamUrl } from './video'

// 导出所有 API 函数
export * from './article'
export * from './auth'
export * from './bangumi'
export * from './comment'
export * from './dynamic'
export * from './live'
export * from './user'
export * from './utils'
export * from './video'

// 导出绑定函数和类型
export type { IBoundBilibiliFetcher } from './bound'
export { createBoundBilibiliFetcher } from './bound'

// 导出接口类型
export type { IBilibiliFetcher } from './types'

/**
 * B站数据获取器
 * 包含所有 B站 API 方法，调用时需要传递 cookie
 * @example
 * ```typescript
 * import { bilibiliFetcher } from '@ikenxuan/amagi'
 *
 * const result = await bilibiliFetcher.fetchVideoInfo({ bvid: 'BV1xx411c7mD' }, cookie)
 * ```
 */
export const bilibiliFetcher = {
  // 视频
  fetchVideoInfo,
  fetchVideoStreamUrl,
  fetchVideoDanmaku,

  // 评论
  fetchComments,
  fetchCommentReplies,

  // 用户
  fetchUserCard,
  fetchUserDynamicList,
  fetchUserSpaceInfo,
  fetchUploaderTotalViews,

  // 动态
  fetchDynamicDetail,
  fetchDynamicCard,

  // 番剧
  fetchBangumiInfo,
  fetchBangumiStreamUrl,

  // 直播
  fetchLiveRoomInfo,
  fetchLiveRoomInitInfo,

  // 专栏
  fetchArticleContent,
  fetchArticleCards,
  fetchArticleInfo,
  fetchArticleListInfo,

  // 登录
  fetchLoginStatus,
  requestLoginQrcode,
  checkQrcodeStatus,
  requestCaptchaFromVoucher,
  validateCaptchaResult,

  // 工具
  convertAvToBv,
  convertBvToAv,
  fetchEmojiList
} as IBilibiliFetcher

/** B站 Fetcher 类型 */
export type BilibiliFetcher = typeof bilibiliFetcher

/** 绑定 Cookie 的 B站 Fetcher 类型 */
export type BoundBilibiliFetcher = import('./bound').IBoundBilibiliFetcher
