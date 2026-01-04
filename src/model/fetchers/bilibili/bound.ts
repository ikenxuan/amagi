/**
 * B站绑定 Cookie 的 Fetcher 接口定义和工厂函数
 * @module fetchers/bilibili/bound
 */

import { RequestConfig } from 'amagi/server'
import { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import { Result } from 'amagi/validation'

import type { BaseRequestOptions, ConditionalReturnType, TypeMode } from '../types'
import { fetchArticleCards, fetchArticleContent, fetchArticleInfo, fetchArticleListInfo } from './article'
import { checkQrcodeStatus, fetchLoginStatus, requestCaptchaFromVoucher, requestLoginQrcode, validateCaptchaResult } from './auth'
import { fetchBangumiInfo, fetchBangumiStreamUrl } from './bangumi'
import { fetchCommentReplies, fetchComments } from './comment'
import { fetchDynamicCard, fetchDynamicDetail } from './dynamic'
import { fetchLiveRoomInfo, fetchLiveRoomInitInfo } from './live'
import type {
  BilibiliApplyCaptchaOptions,
  BilibiliArticleCardOptions,
  BilibiliArticleOptions,
  BilibiliAv2BvOptions,
  BilibiliBangumiInfoOptions,
  BilibiliBangumiStreamOptions,
  BilibiliBv2AvOptions,
  BilibiliCommentRepliesOptions,
  BilibiliCommentsOptions,
  BilibiliDanmakuOptions,
  BilibiliDynamicOptions,
  BilibiliLiveRoomOptions,
  BilibiliQrcodeStatusOptions,
  BilibiliUserOptions,
  BilibiliValidateCaptchaOptions,
  BilibiliVideoInfoOptions,
  BilibiliVideoStreamOptions
} from './types'
import { fetchUploaderTotalViews, fetchUserCard, fetchUserDynamicList, fetchUserSpaceInfo } from './user'
import { convertAvToBv, convertBvToAv, fetchEmojiList } from './utils'
import { fetchVideoDanmaku, fetchVideoInfo, fetchVideoStreamUrl } from './video'

/**
 * 绑定了 Cookie 的 B站 Fetcher 接口
 * 调用方法时无需传递 cookie 参数
 */
export interface IBoundBilibiliFetcher {
  // ==================== 视频相关 ====================

  /** 获取B站视频详细信息 */
  fetchVideoInfo: {
    (options: BilibiliVideoInfoOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['单个视频作品数据']>>
    (options: BilibiliVideoInfoOptions): Promise<Result<any>>
  }

  /** 获取B站视频流地址 */
  fetchVideoStreamUrl: {
    (options: BilibiliVideoStreamOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['单个视频下载信息数据']>>
    (options: BilibiliVideoStreamOptions): Promise<Result<any>>
  }

  /** 获取B站视频实时弹幕 */
  fetchVideoDanmaku: {
    (options: BilibiliDanmakuOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['实时弹幕']>>
    (options: BilibiliDanmakuOptions): Promise<Result<any>>
  }

  // ==================== 评论相关 ====================

  /** 获取B站视频/动态评论列表 */
  fetchComments: {
    (options: BilibiliCommentsOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['评论数据']>>
    (options: BilibiliCommentsOptions): Promise<Result<any>>
  }

  /** 获取B站指定评论的回复列表 */
  fetchCommentReplies: {
    (options: BilibiliCommentRepliesOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['指定评论的回复']>>
    (options: BilibiliCommentRepliesOptions): Promise<Result<any>>
  }

  // ==================== 用户相关 ====================

  /** 获取B站用户名片信息 */
  fetchUserCard: {
    (options: BilibiliUserOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['用户主页数据']>>
    (options: BilibiliUserOptions): Promise<Result<any>>
  }

  /** 获取B站用户动态列表 */
  fetchUserDynamicList: {
    (options: BilibiliUserOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['用户主页动态列表数据']>>
    (options: BilibiliUserOptions): Promise<Result<any>>
  }

  /** 获取B站用户空间详细信息 */
  fetchUserSpaceInfo: {
    (options: BilibiliUserOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['用户空间详细信息']>>
    (options: BilibiliUserOptions): Promise<Result<any>>
  }

  /** 获取B站 UP 主总播放量 */
  fetchUploaderTotalViews: {
    (options: BilibiliUserOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['获取UP主总播放量']>>
    (options: BilibiliUserOptions): Promise<Result<any>>
  }

  // ==================== 动态相关 ====================

  /** 获取B站动态详情 */
  fetchDynamicDetail: {
    (options: BilibiliDynamicOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['动态详情数据']>>
    (options: BilibiliDynamicOptions): Promise<Result<any>>
  }

  /** 获取B站动态卡片信息 */
  fetchDynamicCard: {
    (options: BilibiliDynamicOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['动态卡片数据']>>
    (options: BilibiliDynamicOptions): Promise<Result<any>>
  }

  // ==================== 番剧相关 ====================

  /** 获取B站番剧基本信息 */
  fetchBangumiInfo: {
    (options: BilibiliBangumiInfoOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['番剧基本信息数据']>>
    (options: BilibiliBangumiInfoOptions): Promise<Result<any>>
  }

  /** 获取B站番剧视频流地址 */
  fetchBangumiStreamUrl: {
    (options: BilibiliBangumiStreamOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['番剧下载信息数据']>>
    (options: BilibiliBangumiStreamOptions): Promise<Result<any>>
  }

  // ==================== 直播相关 ====================

  /** 获取B站直播间信息 */
  fetchLiveRoomInfo: {
    (options: BilibiliLiveRoomOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['直播间信息']>>
    (options: BilibiliLiveRoomOptions): Promise<Result<any>>
  }

  /** 获取B站直播间初始化信息 */
  fetchLiveRoomInitInfo: {
    (options: BilibiliLiveRoomOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['直播间初始化信息']>>
    (options: BilibiliLiveRoomOptions): Promise<Result<any>>
  }

  // ==================== 专栏相关 ====================

  /** 获取B站专栏正文内容 */
  fetchArticleContent: {
    (options: BilibiliArticleOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['专栏正文内容']>>
    (options: BilibiliArticleOptions): Promise<Result<any>>
  }

  /** 获取B站专栏卡片信息 */
  fetchArticleCards: {
    (options: BilibiliArticleCardOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['专栏显示卡片信息']>>
    (options: BilibiliArticleCardOptions): Promise<Result<any>>
  }

  /** 获取B站专栏文章基本信息 */
  fetchArticleInfo: {
    (options: BilibiliArticleOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['专栏文章基本信息']>>
    (options: BilibiliArticleOptions): Promise<Result<any>>
  }

  /** 获取B站文集基本信息 */
  fetchArticleListInfo: {
    (options: BilibiliArticleOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['文集基本信息']>>
    (options: BilibiliArticleOptions): Promise<Result<any>>
  }

  // ==================== 登录认证相关 ====================

  /** 获取B站登录状态信息 */
  fetchLoginStatus: {
    (options: { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['登录基本信息']>>
    (options?: BaseRequestOptions): Promise<Result<any>>
  }

  /** 申请B站登录二维码 */
  requestLoginQrcode: {
    (options: { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['申请二维码']>>
    (options?: BaseRequestOptions): Promise<Result<any>>
  }

  /** 检查B站登录二维码扫描状态 */
  checkQrcodeStatus: {
    (options: BilibiliQrcodeStatusOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['二维码状态']>>
    (options: BilibiliQrcodeStatusOptions): Promise<Result<any>>
  }

  /** 从 v_voucher 申请验证码 */
  requestCaptchaFromVoucher: {
    (options: BilibiliApplyCaptchaOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['从_v_voucher_申请_captcha']>>
    (options: BilibiliApplyCaptchaOptions): Promise<Result<any>>
  }

  /** 验证验证码结果 */
  validateCaptchaResult: {
    (options: BilibiliValidateCaptchaOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['验证验证码结果']>>
    (options: BilibiliValidateCaptchaOptions): Promise<Result<any>>
  }

  // ==================== 工具相关 ====================

  /** 将 AV 号转换为 BV 号 */
  convertAvToBv: {
    (options: BilibiliAv2BvOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['AV转BV']>>
    (options: BilibiliAv2BvOptions): Promise<Result<any>>
  }

  /** 将 BV 号转换为 AV 号 */
  convertBvToAv: {
    (options: BilibiliBv2AvOptions & { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['BV转AV']>>
    (options: BilibiliBv2AvOptions): Promise<Result<any>>
  }

  /** 获取B站表情包列表 */
  fetchEmojiList: {
    (options: { typeMode: 'strict' }): Promise<Result<BilibiliReturnTypeMap['Emoji数据']>>
    (options?: BaseRequestOptions): Promise<Result<any>>
  }
}

/**
 * 创建绑定了 Cookie 和请求配置的 B站 Fetcher
 * @param cookie - B站 Cookie
 * @param requestConfig - 请求配置 (可选)
 * @returns 绑定了 Cookie 的 Fetcher 对象，调用时无需传递 cookie
 * @example
 * ```typescript
 * const fetcher = createBoundBilibiliFetcher('your_cookie')
 * const result = await fetcher.fetchVideoInfo({ bvid: 'BV1xx411c7mD' })
 * // 严格模式
 * const strictResult = await fetcher.fetchVideoInfo({ bvid: 'BV1xx411c7mD', typeMode: 'strict' })
 * ```
 */
export function createBoundBilibiliFetcher (
  cookie: string,
  requestConfig?: RequestConfig
): IBoundBilibiliFetcher {
  return {
    // 视频
    fetchVideoInfo: (options) => fetchVideoInfo(options, cookie, requestConfig),
    fetchVideoStreamUrl: (options) => fetchVideoStreamUrl(options, cookie, requestConfig),
    fetchVideoDanmaku: (options) => fetchVideoDanmaku(options, cookie, requestConfig),

    // 评论
    fetchComments: (options) => fetchComments(options, cookie, requestConfig),
    fetchCommentReplies: (options) => fetchCommentReplies(options, cookie, requestConfig),

    // 用户
    fetchUserCard: (options) => fetchUserCard(options, cookie, requestConfig),
    fetchUserDynamicList: (options) => fetchUserDynamicList(options, cookie, requestConfig),
    fetchUserSpaceInfo: (options) => fetchUserSpaceInfo(options, cookie, requestConfig),
    fetchUploaderTotalViews: (options) => fetchUploaderTotalViews(options, cookie, requestConfig),

    // 动态
    fetchDynamicDetail: (options) => fetchDynamicDetail(options, cookie, requestConfig),
    fetchDynamicCard: (options) => fetchDynamicCard(options, cookie, requestConfig),

    // 番剧
    fetchBangumiInfo: (options) => fetchBangumiInfo(options, cookie, requestConfig),
    fetchBangumiStreamUrl: (options) => fetchBangumiStreamUrl(options, cookie, requestConfig),

    // 直播
    fetchLiveRoomInfo: (options) => fetchLiveRoomInfo(options, cookie, requestConfig),
    fetchLiveRoomInitInfo: (options) => fetchLiveRoomInitInfo(options, cookie, requestConfig),

    // 专栏
    fetchArticleContent: (options) => fetchArticleContent(options, cookie, requestConfig),
    fetchArticleCards: (options) => fetchArticleCards(options, cookie, requestConfig),
    fetchArticleInfo: (options) => fetchArticleInfo(options, cookie, requestConfig),
    fetchArticleListInfo: (options) => fetchArticleListInfo(options, cookie, requestConfig),

    // 登录
    fetchLoginStatus: (options) => fetchLoginStatus(options, cookie, requestConfig),
    requestLoginQrcode: (options) => requestLoginQrcode(options, cookie, requestConfig),
    checkQrcodeStatus: (options) => checkQrcodeStatus(options, cookie, requestConfig),
    requestCaptchaFromVoucher: (options) => requestCaptchaFromVoucher(options, cookie, requestConfig),
    validateCaptchaResult: (options) => validateCaptchaResult(options, cookie, requestConfig),

    // 工具
    convertAvToBv: (options) => convertAvToBv(options, cookie, requestConfig),
    convertBvToAv: (options) => convertBvToAv(options, cookie, requestConfig),
    fetchEmojiList: (options) => fetchEmojiList(options, cookie, requestConfig)
  }
}
