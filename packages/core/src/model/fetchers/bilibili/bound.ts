/**
 * B站绑定 Cookie 的 Fetcher 接口定义和工厂函数
 * @module fetchers/bilibili/bound
 */

import { RequestConfig } from 'amagi/server'
import { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'

import type { BoundMethodOverload, BoundNoParamMethodOverload } from '../shared/overload-types'
import { resolveBoundRequest } from '../shared/request-config'
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
import { fetchUploaderTotalViews, fetchUserCard, fetchUserDynamicList, fetchUserLiveStatus, fetchUserSpaceInfo } from './user'
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

  /** 按用户 UID 获取B站直播状态 */
  fetchUserLiveStatus: BoundMethodOverload<BilibiliUserOptions, BilibiliReturnTypeMap['userLiveStatus']>

  /** 获取B站用户空间详细信息 */
  fetchUserSpaceInfo: BoundMethodOverload<BilibiliUserOptions, BilibiliReturnTypeMap['userSpaceInfo']>

  /** 获取B站 UP 主总播放量 */
  fetchUploaderTotalViews: BoundMethodOverload<BilibiliUserOptions, BilibiliReturnTypeMap['uploaderTotalViews']>

  // ==================== 动态相关 ====================

  /** 获取B站动态详情 */
  fetchDynamicDetail: BoundMethodOverload<BilibiliDynamicOptions, BilibiliReturnTypeMap['dynamicDetail']>

  /**
   * 获取B站动态卡片信息
   * @deprecated v6.1.3 已废弃，B站官方已于 `2025-08-09` 删除原 `dynamic_svr` 接口。
   * 调用将返回错误信息
   * 计划于 v7.0.0 移除。
   */
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
export function createBoundBilibiliFetcher(cookie: string, requestConfig?: RequestConfig): IBoundBilibiliFetcher {
  const resolveRequest = (override?: RequestConfig) => resolveBoundRequest(cookie, requestConfig, override)

  return {
    // 视频
    fetchVideoInfo: (options, override) => fetchVideoInfo(options, ...resolveRequest(override)),
    fetchVideoStreamUrl: (options, override) => fetchVideoStreamUrl(options, ...resolveRequest(override)),
    fetchVideoDanmaku: (options, override) => fetchVideoDanmaku(options, ...resolveRequest(override)),

    // 评论
    fetchComments: (options, override) => fetchComments(options, ...resolveRequest(override)),
    fetchCommentReplies: (options, override) => fetchCommentReplies(options, ...resolveRequest(override)),

    // 用户
    fetchUserCard: (options, override) => fetchUserCard(options, ...resolveRequest(override)),
    fetchUserDynamicList: (options, override) => fetchUserDynamicList(options, ...resolveRequest(override)),
    fetchUserLiveStatus: (options, override) => fetchUserLiveStatus(options, ...resolveRequest(override)),
    fetchUserSpaceInfo: (options, override) => fetchUserSpaceInfo(options, ...resolveRequest(override)),
    fetchUploaderTotalViews: (options, override) => fetchUploaderTotalViews(options, ...resolveRequest(override)),

    // 动态
    fetchDynamicDetail: (options, override) => fetchDynamicDetail(options, ...resolveRequest(override)),
    /** @deprecated v6.1.3 已废弃，调用将返回错误信息 */
    fetchDynamicCard: (options, override) => fetchDynamicCard(options, ...resolveRequest(override)),

    // 番剧
    fetchBangumiInfo: (options, override) => fetchBangumiInfo(options, ...resolveRequest(override)),
    fetchBangumiStreamUrl: (options, override) => fetchBangumiStreamUrl(options, ...resolveRequest(override)),

    // 直播
    fetchLiveRoomInfo: (options, override) => fetchLiveRoomInfo(options, ...resolveRequest(override)),
    fetchLiveRoomInitInfo: (options, override) => fetchLiveRoomInitInfo(options, ...resolveRequest(override)),

    // 专栏
    fetchArticleContent: (options, override) => fetchArticleContent(options, ...resolveRequest(override)),
    fetchArticleCards: (options, override) => fetchArticleCards(options, ...resolveRequest(override)),
    fetchArticleInfo: (options, override) => fetchArticleInfo(options, ...resolveRequest(override)),
    fetchArticleListInfo: (options, override) => fetchArticleListInfo(options, ...resolveRequest(override)),

    // 登录
    fetchLoginStatus: (options, override) => fetchLoginStatus(options, ...resolveRequest(override)),
    requestLoginQrcode: (options, override) => requestLoginQrcode(options, ...resolveRequest(override)),
    checkQrcodeStatus: (options, override) => checkQrcodeStatus(options, ...resolveRequest(override)),
    requestCaptchaFromVoucher: (options, override) => requestCaptchaFromVoucher(options, ...resolveRequest(override)),
    validateCaptchaResult: (options, override) => validateCaptchaResult(options, ...resolveRequest(override)),

    // 工具
    convertAvToBv: (options, override) => convertAvToBv(options, ...resolveRequest(override)),
    convertBvToAv: (options, override) => convertBvToAv(options, ...resolveRequest(override)),
    fetchEmojiList: (options, override) => fetchEmojiList(options, ...resolveRequest(override))
  }
}
