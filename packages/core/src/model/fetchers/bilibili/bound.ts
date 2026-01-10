/**
 * B站绑定 Cookie 的 Fetcher 接口定义和工厂函数
 * @module fetchers/bilibili/bound
 */

import { RequestConfig } from 'amagi/server'
import { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import { Result } from 'amagi/validation'

import type { BoundMethodOverload, BoundNoParamMethodOverload } from '../shared/overload-types'
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
  fetchVideoInfo: BoundMethodOverload<BilibiliVideoInfoOptions, BilibiliReturnTypeMap['videoInfo']>

  /** 获取B站视频流地址 */
  fetchVideoStreamUrl: BoundMethodOverload<BilibiliVideoStreamOptions, BilibiliReturnTypeMap['videoStream']>

  /** 获取B站视频实时弹幕 */
  fetchVideoDanmaku: BoundMethodOverload<BilibiliDanmakuOptions, BilibiliReturnTypeMap['videoDanmaku']>

  // ==================== 评论相关 ====================

  /** 获取B站视频/动态评论列表 */
  fetchComments: BoundMethodOverload<BilibiliCommentsOptions, BilibiliReturnTypeMap['comments']>

  /** 获取B站指定评论的回复列表 */
  fetchCommentReplies: BoundMethodOverload<BilibiliCommentRepliesOptions, BilibiliReturnTypeMap['commentReplies']>

  // ==================== 用户相关 ====================

  /** 获取B站用户名片信息 */
  fetchUserCard: BoundMethodOverload<BilibiliUserOptions, BilibiliReturnTypeMap['userCard']>

  /** 获取B站用户动态列表 */
  fetchUserDynamicList: BoundMethodOverload<BilibiliUserOptions, BilibiliReturnTypeMap['userDynamicList']>

  /** 获取B站用户空间详细信息 */
  fetchUserSpaceInfo: BoundMethodOverload<BilibiliUserOptions, BilibiliReturnTypeMap['userSpaceInfo']>

  /** 获取B站 UP 主总播放量 */
  fetchUploaderTotalViews: BoundMethodOverload<BilibiliUserOptions, BilibiliReturnTypeMap['uploaderTotalViews']>

  // ==================== 动态相关 ====================

  /** 获取B站动态详情 */
  fetchDynamicDetail: BoundMethodOverload<BilibiliDynamicOptions, BilibiliReturnTypeMap['dynamicDetail']>

  /** 获取B站动态卡片信息 */
  fetchDynamicCard: BoundMethodOverload<BilibiliDynamicOptions, BilibiliReturnTypeMap['dynamicCard']>

  // ==================== 番剧相关 ====================

  /** 获取B站番剧基本信息 */
  fetchBangumiInfo: BoundMethodOverload<BilibiliBangumiInfoOptions, BilibiliReturnTypeMap['bangumiInfo']>

  /** 获取B站番剧视频流地址 */
  fetchBangumiStreamUrl: BoundMethodOverload<BilibiliBangumiStreamOptions, BilibiliReturnTypeMap['bangumiStream']>

  // ==================== 直播相关 ====================

  /** 获取B站直播间信息 */
  fetchLiveRoomInfo: BoundMethodOverload<BilibiliLiveRoomOptions, BilibiliReturnTypeMap['liveRoomInfo']>

  /** 获取B站直播间初始化信息 */
  fetchLiveRoomInitInfo: BoundMethodOverload<BilibiliLiveRoomOptions, BilibiliReturnTypeMap['liveRoomInit']>

  // ==================== 专栏相关 ====================

  /** 获取B站专栏正文内容 */
  fetchArticleContent: BoundMethodOverload<BilibiliArticleOptions, BilibiliReturnTypeMap['articleContent']>

  /** 获取B站专栏卡片信息 */
  fetchArticleCards: BoundMethodOverload<BilibiliArticleCardOptions, BilibiliReturnTypeMap['articleCards']>

  /** 获取B站专栏文章基本信息 */
  fetchArticleInfo: BoundMethodOverload<BilibiliArticleOptions, BilibiliReturnTypeMap['articleInfo']>

  /** 获取B站文集基本信息 */
  fetchArticleListInfo: BoundMethodOverload<BilibiliArticleOptions, BilibiliReturnTypeMap['articleListInfo']>

  // ==================== 登录认证相关 ====================

  /** 获取B站登录状态信息 */
  fetchLoginStatus: BoundNoParamMethodOverload<BilibiliReturnTypeMap['loginStatus']>

  /** 申请B站登录二维码 */
  requestLoginQrcode: BoundNoParamMethodOverload<BilibiliReturnTypeMap['loginQrcode']>

  /** 检查B站登录二维码扫描状态 */
  checkQrcodeStatus: BoundMethodOverload<BilibiliQrcodeStatusOptions, BilibiliReturnTypeMap['qrcodeStatus']>

  /** 从 v_voucher 申请验证码 */
  requestCaptchaFromVoucher: BoundMethodOverload<BilibiliApplyCaptchaOptions, BilibiliReturnTypeMap['captchaFromVoucher']>

  /** 验证验证码结果 */
  validateCaptchaResult: BoundMethodOverload<BilibiliValidateCaptchaOptions, BilibiliReturnTypeMap['validateCaptcha']>

  // ==================== 工具相关 ====================

  /** 将 AV 号转换为 BV 号 */
  convertAvToBv: BoundMethodOverload<BilibiliAv2BvOptions, BilibiliReturnTypeMap['avToBv']>

  /** 将 BV 号转换为 AV 号 */
  convertBvToAv: BoundMethodOverload<BilibiliBv2AvOptions, BilibiliReturnTypeMap['bvToAv']>

  /** 获取B站表情包列表 */
  fetchEmojiList: BoundNoParamMethodOverload<BilibiliReturnTypeMap['emojiList']>
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
